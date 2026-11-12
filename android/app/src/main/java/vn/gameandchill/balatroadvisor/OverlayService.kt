package vn.gameandchill.balatroadvisor

import android.annotation.SuppressLint
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.PixelFormat
import android.graphics.RectF
import android.graphics.drawable.GradientDrawable
import android.hardware.display.DisplayManager
import android.hardware.display.VirtualDisplay
import android.media.Image
import android.media.ImageReader
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.DisplayMetrics
import android.view.Display
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.app.ServiceCompat
import org.json.JSONArray
import org.json.JSONObject
import kotlin.math.abs

/**
 * Dịch vụ nổi: bong bóng kéo được, bảng cố vấn (WebView) và lớp vẽ khung gợi ý trên game.
 * Nếu người dùng cho phép quay màn hình, giữ một VirtualDisplay để chụp khi bấm "Quét".
 */
class OverlayService : Service() {

    companion object {
        const val EXTRA_RESULT_CODE = "rc"
        const val EXTRA_DATA = "data"
        const val ACTION_STOP = "stop"
        private const val CHANNEL = "advisor"
        @Volatile var running = false
    }

    private lateinit var wm: WindowManager
    private val main = Handler(Looper.getMainLooper())
    private lateinit var detector: CardDetector

    private var bubble: TextView? = null
    private var bubbleLp: WindowManager.LayoutParams? = null
    private var panel: LinearLayout? = null
    private var panelLp: WindowManager.LayoutParams? = null
    private var web: WebView? = null
    private var hl: HighlightView? = null
    private var panelShown = false
    private var dock = 0          // 0 = phải, 1 = trái, 2 = dưới
    private var dimmed = false

    private var projection: MediaProjection? = null
    private var vd: VirtualDisplay? = null
    private var reader: ImageReader? = null
    private var scanning = false

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        wm = getSystemService(WINDOW_SERVICE) as WindowManager
        detector = CardDetector(GlyphStore(this))
        val nm = getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(NotificationChannel(CHANNEL, "Bong bóng gợi ý", NotificationManager.IMPORTANCE_LOW))
        running = true
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) { stopSelf(); return START_NOT_STICKY }
        val rc = intent?.getIntExtra(EXTRA_RESULT_CODE, 0) ?: 0
        val data: Intent? = if (Build.VERSION.SDK_INT >= 33) intent?.getParcelableExtra(EXTRA_DATA, Intent::class.java)
            else @Suppress("DEPRECATION") intent?.getParcelableExtra(EXTRA_DATA)
        val type = when {
            data != null -> ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION
            Build.VERSION.SDK_INT >= 34 -> ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE
            else -> 0
        }
        ServiceCompat.startForeground(this, 1, notification(), type)
        if (data != null) setupProjection(rc, data)
        if (bubble == null) { addHighlight(); addPanel(); addBubble() }
        return START_NOT_STICKY
    }

    private fun notification(): Notification {
        val stop = PendingIntent.getService(this, 1, Intent(this, OverlayService::class.java).setAction(ACTION_STOP), PendingIntent.FLAG_IMMUTABLE)
        val open = PendingIntent.getActivity(this, 2, Intent(this, MainActivity::class.java), PendingIntent.FLAG_IMMUTABLE)
        return Notification.Builder(this, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat)
            .setContentTitle("Balatro Advisor đang bật")
            .setContentText("Chạm bong bóng trên màn hình để xem gợi ý")
            .setContentIntent(open)
            .addAction(Notification.Action.Builder(null, "Tắt", stop).build())
            .setOngoing(true)
            .build()
    }

    // ---------- Quay màn hình ----------
    private fun screen(): Triple<Int, Int, Int> {
        val dpi = resources.displayMetrics.densityDpi
        return try {
            // Kích thước thật của màn hình (gồm thanh điều hướng), cập nhật theo chiều xoay
            val d = getSystemService(DisplayManager::class.java).getDisplay(Display.DEFAULT_DISPLAY)
            val m = DisplayMetrics(); @Suppress("DEPRECATION") d.getRealMetrics(m); Triple(m.widthPixels, m.heightPixels, dpi)
        } catch (e: Exception) {
            val m = resources.displayMetrics; Triple(m.widthPixels, m.heightPixels, dpi)
        }
    }

    private fun setupProjection(rc: Int, data: Intent) {
        releaseCapture()
        val mpm = getSystemService(MediaProjectionManager::class.java)
        val p = mpm.getMediaProjection(rc, data) ?: return
        p.registerCallback(object : MediaProjection.Callback() {
            override fun onStop() { main.post { releaseCapture(); toastJs("Đã dừng quay màn hình — mở app để bật lại quét") } }
        }, main)
        projection = p
        val (w, h, dpi) = screen()
        val r = ImageReader.newInstance(w, h, PixelFormat.RGBA_8888, 2)
        reader = r
        vd = p.createVirtualDisplay("balatro-advisor", w, h, dpi, DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR, r.surface, null, null)
    }

    private fun releaseCapture() {
        try { vd?.release() } catch (_: Exception) {}
        try { reader?.close() } catch (_: Exception) {}
        try { projection?.stop() } catch (_: Exception) {}
        vd = null; reader = null; projection = null
    }

    private fun scan(expected: Int) {
        if (scanning) return
        if (projection == null || vd == null) {
            toastJs("Chưa bật quét màn hình. Mở app Balatro Advisor, bấm \"Bật bong bóng + quét màn hình\".")
            return
        }
        scanning = true
        // Màn hình xoay → tạo lại bộ đọc ảnh đúng kích thước
        val (w, h, dpi) = screen()
        val r0 = reader
        if (r0 == null || r0.width != w || r0.height != h) {
            val nr = ImageReader.newInstance(w, h, PixelFormat.RGBA_8888, 2)
            vd?.resize(w, h, dpi); vd?.surface = nr.surface
            r0?.close(); reader = nr
        }
        setOverlaysVisible(false)
        main.postDelayed({ grab(expected, 0) }, 380)
    }

    private fun grab(expected: Int, attempt: Int) {
        var img: Image? = null
        try { img = reader?.acquireLatestImage() } catch (_: Exception) {}
        if (img == null) {
            if (attempt < 6) { main.postDelayed({ grab(expected, attempt + 1) }, 120); return }
            setOverlaysVisible(true); scanning = false
            toastJs("Không chụp được màn hình, thử lại."); return
        }
        val bmp = try { toBitmap(img) } finally { img.close() }
        setOverlaysVisible(true)
        Thread {
            val found = try { detector.detect(bmp, expected) } catch (e: Exception) { emptyList() }
            bmp.recycle()
            main.post { scanning = false; sendScan(found) }
        }.start()
    }

    private fun toBitmap(img: Image): Bitmap {
        val plane = img.planes[0]
        val ps = plane.pixelStride; val rs = plane.rowStride
        val padW = (rs - ps * img.width) / ps
        val b = Bitmap.createBitmap(img.width + padW, img.height, Bitmap.Config.ARGB_8888)
        b.copyPixelsFromBuffer(plane.buffer)
        if (padW == 0) return b
        val c = Bitmap.createBitmap(b, 0, 0, img.width, img.height); b.recycle(); return c
    }

    private fun sendScan(found: List<FoundCard>) {
        val arr = JSONArray()
        for (c in found) {
            val o = JSONObject().put("tid", c.tid).put("box", JSONArray().apply { c.box.forEach { put(it) } })
            if (c.rank != null && c.suit != null) o.put("rank", c.rank).put("suit", c.suit)
            if (c.thumb != null) o.put("img", c.thumb)
            arr.put(o)
        }
        hl?.setMarks(emptyList(), null)
        showPanel()
        js("window.__onScan(${JSONObject.quote(JSONObject().put("cards", arr).toString())})")
    }

    // ---------- Bong bóng ----------
    @SuppressLint("ClickableViewAccessibility")
    private fun addBubble() {
        val size = dp(54)
        val tv = TextView(this).apply {
            text = "B"; textSize = 22f; gravity = Gravity.CENTER; setTextColor(Color.parseColor("#2A2006"))
            background = GradientDrawable().apply { shape = GradientDrawable.OVAL; setColor(Color.parseColor("#EAB83F")); setStroke(dp(2), Color.parseColor("#0D2622")) }
            elevation = dp(6).toFloat()
        }
        val lp = WindowManager.LayoutParams(size, size, WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS, PixelFormat.TRANSLUCENT)
        lp.gravity = Gravity.TOP or Gravity.START; lp.x = dp(8); lp.y = dp(120)
        var downX = 0f; var downY = 0f; var startX = 0; var startY = 0; var moved = false
        tv.setOnTouchListener { _, e ->
            when (e.actionMasked) {
                MotionEvent.ACTION_DOWN -> { downX = e.rawX; downY = e.rawY; startX = lp.x; startY = lp.y; moved = false; true }
                MotionEvent.ACTION_MOVE -> {
                    val dx = e.rawX - downX; val dy = e.rawY - downY
                    if (abs(dx) > dp(6) || abs(dy) > dp(6)) moved = true
                    if (moved) { lp.x = startX + dx.toInt(); lp.y = startY + dy.toInt(); wm.updateViewLayout(tv, lp) }
                    true
                }
                MotionEvent.ACTION_UP -> { if (!moved) togglePanel(); true }
                else -> false
            }
        }
        wm.addView(tv, lp)
        bubble = tv; bubbleLp = lp
    }

    // ---------- Bảng cố vấn ----------
    @SuppressLint("SetJavaScriptEnabled")
    private fun addPanel() {
        val wv = WebView(this)
        wv.settings.javaScriptEnabled = true
        wv.settings.domStorageEnabled = true
        wv.settings.allowFileAccess = true
        wv.setBackgroundColor(Color.parseColor("#0D2622"))
        wv.addJavascriptInterface(Bridge(), "AndroidBridge")
        wv.loadUrl("file:///android_asset/index.html")
        web = wv

        fun barBtn(label: String, onClick: () -> Unit) = Button(this).apply {
            text = label; isAllCaps = false; textSize = 13f; setTextColor(Color.parseColor("#ECF2EE"))
            setBackgroundColor(Color.parseColor("#1B443C"))
            layoutParams = LinearLayout.LayoutParams(0, dp(38), 1f).apply { marginEnd = dp(4) }
            setPadding(0, 0, 0, 0)
            setOnClickListener { onClick() }
        }
        val bar = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            setPadding(dp(6), dp(4), dp(2), dp(4))
            setBackgroundColor(Color.parseColor("#143630"))
            addView(barBtn("Thu nhỏ") { hidePanel() })
            addView(barBtn("Quét") { js("window.__advisor && window.AndroidBridge.scan(window.__advisor.state().handSize||8)") })
            addView(barBtn("Đổi bên") { dock = (dock + 1) % 3; layoutPanel() })
            addView(barBtn("Mờ") { dimmed = !dimmed; panel?.alpha = if (dimmed) 0.55f else 1f })
        }
        val box = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            addView(bar, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT))
            addView(wv, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f))
            visibility = View.GONE
        }
        val lp = WindowManager.LayoutParams(dp(360), dp(500), WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL, PixelFormat.TRANSLUCENT)
        lp.softInputMode = WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE
        wm.addView(box, lp)
        panel = box; panelLp = lp
        layoutPanel()
    }

    private fun layoutPanel() {
        val p = panel ?: return; val lp = panelLp ?: return
        val (w, h, _) = screen()
        val landscape = w > h
        if (dock == 2 || !landscape) {
            lp.gravity = Gravity.BOTTOM; lp.width = WindowManager.LayoutParams.MATCH_PARENT; lp.height = (h * if (landscape) 0.55f else 0.6f).toInt()
        } else {
            lp.gravity = if (dock == 0) Gravity.END or Gravity.TOP else Gravity.START or Gravity.TOP
            lp.width = (w * 0.42f).toInt().coerceAtLeast(dp(340)).coerceAtMost(w); lp.height = WindowManager.LayoutParams.MATCH_PARENT
        }
        lp.x = 0; lp.y = 0
        wm.updateViewLayout(p, lp)
    }

    private fun togglePanel() { if (panelShown) hidePanel() else showPanel() }
    private fun showPanel() { panelShown = true; layoutPanel(); panel?.visibility = View.VISIBLE }
    private fun hidePanel() { panelShown = false; panel?.visibility = View.GONE }

    private fun setOverlaysVisible(v: Boolean) {
        val vis = if (v) View.VISIBLE else View.GONE
        bubble?.visibility = vis
        hl?.visibility = vis
        panel?.visibility = if (v && panelShown) View.VISIBLE else View.GONE
    }

    // ---------- Lớp vẽ khung gợi ý ----------
    private fun addHighlight() {
        val v = HighlightView(this)
        val lp = WindowManager.LayoutParams(WindowManager.LayoutParams.MATCH_PARENT, WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE or
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT)
        lp.gravity = Gravity.TOP or Gravity.START
        lp.alpha = 0.8f // Android 12+: cửa sổ đè trong suốt ≤ 0.8 mới cho chạm xuyên xuống game
        if (Build.VERSION.SDK_INT >= 28) lp.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
        wm.addView(v, lp)
        hl = v
    }

    class Mark(val box: IntArray, val color: Int)

    class HighlightView(context: Context) : View(context) {
        private var marks: List<Mark> = emptyList()
        private var label: String? = null
        private val stroke = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE; strokeWidth = 8f }
        private val fill = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.FILL }
        private val text = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.WHITE; textSize = 44f; isFakeBoldText = true }

        fun setMarks(m: List<Mark>, l: String?) { marks = m; label = l; invalidate() }

        override fun onDraw(canvas: Canvas) {
            val loc = IntArray(2); getLocationOnScreen(loc)
            for (m in marks) {
                val r = RectF((m.box[0] - loc[0]).toFloat(), (m.box[1] - loc[1]).toFloat(),
                    (m.box[0] + m.box[2] - loc[0]).toFloat(), (m.box[1] + m.box[3] - loc[1]).toFloat())
                stroke.color = m.color
                canvas.drawRoundRect(r, 14f, 14f, stroke)
                fill.color = m.color
                canvas.drawRoundRect(RectF(r.left, r.top - 18f, r.right, r.top - 4f), 6f, 6f, fill)
            }
            label?.let {
                val w = text.measureText(it) + 48f
                val x = (width - w) / 2f
                fill.color = Color.parseColor("#E60D2622")
                canvas.drawRoundRect(RectF(x, 24f, x + w, 96f), 18f, 18f, fill)
                canvas.drawText(it, x + 24f, 76f, text)
            }
        }
    }

    // ---------- Cầu nối JS ----------
    inner class Bridge {
        @JavascriptInterface fun scan(expected: Int) { main.post { this@OverlayService.scan(expected) } }
        @JavascriptInterface fun learn(tid: String, rank: Int, suit: String) { detector.learn(tid, rank, suit) }
        @JavascriptInterface fun canScan(): Boolean = projection != null
        @JavascriptInterface fun minimize() { main.post { hidePanel() } }
        @JavascriptInterface fun clearHighlight() { main.post { hl?.setMarks(emptyList(), null) } }
        @JavascriptInterface fun highlight(json: String) {
            main.post {
                try {
                    val o = JSONObject(json)
                    val arr = o.optJSONArray("marks") ?: JSONArray()
                    val list = ArrayList<Mark>()
                    for (i in 0 until arr.length()) {
                        val m = arr.getJSONObject(i); val b = m.getJSONArray("box")
                        list.add(Mark(IntArray(4) { b.getInt(it) }, Color.parseColor(m.optString("color", "#4CC98F"))))
                    }
                    hl?.setMarks(list, o.optString("label").ifEmpty { null })
                    if (list.isNotEmpty()) hidePanel() // cất bảng để thấy khung trên lá
                } catch (_: Exception) {}
            }
        }
    }

    private fun js(code: String) { main.post { web?.evaluateJavascript(code, null) } }
    private fun toastJs(msg: String) { showPanel(); js("window.__toast && window.__toast(${JSONObject.quote(msg)})") }

    private fun dp(v: Int) = (v * resources.displayMetrics.density).toInt()

    override fun onDestroy() {
        running = false
        releaseCapture()
        listOf<View?>(bubble, panel, hl).forEach { v -> try { if (v != null) wm.removeView(v) } catch (_: Exception) {} }
        web?.destroy()
        super.onDestroy()
    }
}
