package vn.gameandchill.balatroadvisor

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.media.projection.MediaProjectionManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.view.Gravity
import android.view.ViewGroup
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView

/** Màn hình khởi động: xin quyền overlay + quay màn hình rồi bật bong bóng nổi. */
class MainActivity : Activity() {

    private lateinit var status: TextView
    private val reqCapture = 41

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (Build.VERSION.SDK_INT >= 33) {
            requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 7)
        }
        val pad = dp(20)
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(pad, pad * 2, pad, pad)
            setBackgroundColor(Color.parseColor("#0D2622"))
        }
        fun text(s: String, size: Float, color: String = "#ECF2EE", bold: Boolean = false) =
            TextView(this).apply {
                text = s; textSize = size; setTextColor(Color.parseColor(color))
                if (bold) typeface = Typeface.DEFAULT_BOLD
                setPadding(0, dp(6), 0, dp(6))
            }
        fun button(s: String, bg: String, fg: String = "#2A2006", onClick: () -> Unit) =
            Button(this).apply {
                text = s; isAllCaps = false; textSize = 16f
                setTextColor(Color.parseColor(fg)); setBackgroundColor(Color.parseColor(bg))
                layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(56)).apply { topMargin = dp(12) }
                setOnClickListener { onClick() }
            }

        root.addView(text("Balatro Advisor", 28f, bold = true))
        root.addView(text("Bong bóng nổi trên game: chạm để mở bảng gợi ý, bấm \"Quét màn hình\" để app tự đọc lá trên tay và vẽ khung lá nên đánh/bỏ. App chỉ chỉ nước, bạn tự thao tác trong game.", 15f, "#98B3AA"))
        status = text("", 15f, "#EAB83F")
        root.addView(status)
        root.addView(button("1. Cho phép hiển thị trên app khác", "#1B443C", "#ECF2EE") {
            startActivity(Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:$packageName")))
        })
        root.addView(button("2. Bật bong bóng + quét màn hình", "#EAB83F") { startWithCapture() })
        root.addView(button("Bật bong bóng (tự nhập lá, không quét)", "#1B443C", "#ECF2EE") { startService(null, 0) })
        root.addView(button("Tắt bong bóng", "#1B443C", "#FF9DA1") {
            stopService(Intent(this, OverlayService::class.java)); refresh()
        })
        root.addView(text("Mẹo để quét chính xác", 17f, bold = true).apply { setPadding(0, dp(24), 0, dp(4)) })
        root.addView(text("• Trong cài đặt game, tắt CRT và giảm rung màn hình.\n• Lần đầu quét, app hỏi từng lá là gì — dạy một lần, lần sau tự nhận.\n• Lá có Enhancement đổi màu nền (Bonus, Mult, Gold, Steel, Stone…) có thể không được nhận: thêm tay trong bảng.\n• Khi quét, Android hiện biểu tượng ghi màn hình — đó là bình thường.", 14f, "#98B3AA"))

        setContentView(ScrollView(this).apply { addView(root); setBackgroundColor(Color.parseColor("#0D2622")) })
        root.gravity = Gravity.TOP
    }

    override fun onResume() { super.onResume(); refresh() }

    private fun refresh() {
        status.text = when {
            !Settings.canDrawOverlays(this) -> "Chưa có quyền hiển thị trên app khác — bấm nút 1."
            OverlayService.running -> "Bong bóng đang bật. Mở Balatro và chạm vào bong bóng."
            else -> "Sẵn sàng. Bấm nút 2 để bật."
        }
    }

    private fun startWithCapture() {
        if (!Settings.canDrawOverlays(this)) { refresh(); return }
        val mpm = getSystemService(MediaProjectionManager::class.java)
        @Suppress("DEPRECATION")
        startActivityForResult(mpm.createScreenCaptureIntent(), reqCapture)
    }

    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == reqCapture) {
            if (resultCode == RESULT_OK && data != null) startService(data, resultCode)
            else status.text = "Bạn chưa cho phép quay màn hình — vẫn có thể dùng chế độ tự nhập."
        }
    }

    private fun startService(data: Intent?, resultCode: Int) {
        if (!Settings.canDrawOverlays(this)) { refresh(); return }
        val i = Intent(this, OverlayService::class.java)
        if (data != null) {
            i.putExtra(OverlayService.EXTRA_RESULT_CODE, resultCode)
            i.putExtra(OverlayService.EXTRA_DATA, data)
        }
        startForegroundService(i)
        status.text = "Đã bật. Mở Balatro rồi chạm vào bong bóng."
        moveTaskToBack(true)
    }

    private fun dp(v: Int) = (v * resources.displayMetrics.density).toInt()
}
