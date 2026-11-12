package vn.gameandchill.balatroadvisor

import android.content.Context
import android.graphics.Bitmap
import android.util.Base64
import org.json.JSONArray
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.io.File
import kotlin.math.ceil
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt
import kotlin.math.sqrt

/** Một lá tìm thấy trên màn hình. rank/suit = null nếu chưa chắc. box theo pixel màn hình. */
class FoundCard(val rank: Int?, val suit: String?, val box: IntArray, val tid: String, val thumb: String?)

/**
 * Kho ký hiệu: mẫu "số" (rank) và "chất" (suit) ở góc lá.
 * Mẫu sẵn trong assets/glyphs.json (tạo từ ảnh chụp thật), mẫu người chơi dạy lưu ở filesDir.
 */
class GlyphStore(context: Context) {
    class G(val kind: String, val label: String, val red: Boolean, val f: FloatArray)
    val items = mutableListOf<G>()
    private val learned = mutableListOf<G>()
    private val file = File(context.filesDir, "glyphs_learned.json")

    init {
        try { parse(context.assets.open("glyphs.json").bufferedReader().readText(), items) } catch (_: Exception) {}
        try { if (file.exists()) { parse(file.readText(), learned); items.addAll(learned) } } catch (_: Exception) {}
    }

    private fun parse(text: String, into: MutableList<G>) {
        val arr = JSONArray(text)
        for (i in 0 until arr.length()) {
            val o = arr.getJSONObject(i); val fa = o.getJSONArray("f")
            into.add(G(o.getString("kind"), o.getString("label"), o.getBoolean("red"), FloatArray(fa.length()) { fa.getDouble(it).toFloat() }))
        }
    }

    @Synchronized fun add(g: G) {
        items.add(g); learned.add(g)
        val arr = JSONArray()
        for (x in learned) {
            val fa = JSONArray(); for (v in x.f) fa.put(v.toDouble())
            arr.put(JSONObject().put("kind", x.kind).put("label", x.label).put("red", x.red).put("f", fa))
        }
        file.writeText(arr.toString())
    }
}

/**
 * Tìm lá trên tay trong ảnh chụp Balatro (đã kiểm trên ảnh chụp thật 2376×1080):
 * 1. thu nhỏ, đánh dấu điểm ảnh "giấy" (sáng, ít màu) ở phần dưới màn hình;
 * 2. lấy khối lớn nhất (tay bài xếp quạt chồng mép thành một khối) + các khối cùng hàng;
 * 3. bề rộng lá = chiều cao × 71/95 (tỉ lệ sprite lá Balatro), chia đều theo số lá trên tay;
 * 4. mép trên từng lá đo ở phần không bị lá bên trái đè (lá đang chọn nhô lên);
 * 5. cắt góc trái-trên, tách 2 ký hiệu (số ở trên, chất ở dưới), so với mẫu.
 */
class CardDetector(private val store: GlyphStore) {
    private class Pending(val rank: FloatArray, val suit: FloatArray, val red: Boolean)
    private val pending = HashMap<String, Pending>()
    private var seq = 0

    private class Comp(var minX: Int, var maxX: Int, var minY: Int, var maxY: Int, var n: Int) {
        val w get() = maxX - minX + 1
        val h get() = maxY - minY + 1
    }

    fun detect(full: Bitmap, expected: Int): List<FoundCard> {
        val W = full.width; val H = full.height
        val f = 640f / max(W, H)
        val sw = max(1, (W * f).roundToInt()); val sh = max(1, (H * f).roundToInt())
        val small = Bitmap.createScaledBitmap(full, sw, sh, true)
        val px = IntArray(sw * sh); small.getPixels(px, 0, sw, 0, 0, sw, sh)
        if (small !== full) small.recycle()

        val yStart = (sh * 0.38f).toInt()
        val mask = BooleanArray(sw * sh)
        for (y in yStart until sh) for (x in 0 until sw) {
            val c = px[y * sw + x]
            val r = (c shr 16) and 255; val g = (c shr 8) and 255; val b = c and 255
            mask[y * sw + x] = r > 185 && g > 180 && b > 165 && max(r, max(g, b)) - min(r, min(g, b)) < 48
        }
        val comps = components(mask, sw, sh)
            .filter { it.h >= sh * 0.09f && it.w >= sw * 0.03f && it.n >= 0.35f * it.w * it.h }
        val main = comps.maxByOrNull { it.n } ?: return emptyList()
        // gộp các khối cùng hàng (lá Enhancement nền màu có thể chia đôi khối trắng)
        var x0 = main.minX; var x1 = main.maxX; var y0 = main.minY; var y1 = main.maxY
        for (c in comps) {
            val overlap = min(c.maxY, main.maxY) - max(c.minY, main.minY)
            if (c !== main && overlap >= 0.5f * min(c.h, main.h)) { x0 = min(x0, c.minX); x1 = max(x1, c.maxX); y0 = min(y0, c.minY); y1 = max(y1, c.maxY) }
        }
        // chiều cao lá: phân vị 30% chiều cao các cột
        val hs = ArrayList<Int>()
        for (x in x0..x1) {
            var top = -1; var bot = -1
            for (y in y0..y1) if (mask[y * sw + x]) { if (top < 0) top = y; bot = y }
            if (top >= 0) hs.add(bot - top + 1)
        }
        if (hs.isEmpty()) return emptyList()
        hs.sort()
        val ch = hs[(hs.size * 0.3f).toInt().coerceIn(0, hs.size - 1)].toFloat()
        val cw = ch * 71f / 95f
        val width = (x1 - x0 + 1).toFloat()
        val n = if (expected in 1..20) expected else max(1, ((width - cw) / (cw * 0.76f)).roundToInt() + 1)
        val step = if (n > 1) (width - cw) / (n - 1) else 0f

        val out = ArrayList<FoundCard>()
        for (j in 0 until n) {
            val sx = x0 + j * step
            var a = if (j > 0) sx + max(0f, cw - step) + 2 else sx
            var b = if (j < n - 1) sx + step - 2 else sx + cw
            if (b - a < 3) { a = sx; b = sx + max(3f, step * 0.6f) }
            var top = -1
            loop@ for (y in y0..y1) for (x in a.toInt()..min(sw - 1, b.toInt())) if (mask[y * sw + x]) { top = y; break@loop }
            if (top < 0) top = y0
            val box = intArrayOf((sx / f).toInt(), (top / f).toInt(), (cw / f).toInt(), (ch / f).toInt())
            // khung vẽ gợi ý chỉ bao phần lá nhìn thấy (lá sau đè lên phần phải của lá trước)
            val visW = if (j < n - 1) (step / f).toInt() else box[2]
            out.add(classify(full, box, visW))
        }
        return out
    }

    private fun components(mask: BooleanArray, sw: Int, sh: Int): List<Comp> {
        val seen = BooleanArray(sw * sh); val q = IntArray(sw * sh); val out = ArrayList<Comp>()
        for (start in 0 until sw * sh) {
            if (!mask[start] || seen[start]) continue
            var head = 0; var tail = 0
            q[tail++] = start; seen[start] = true
            val c = Comp(sw, 0, sh, 0, 0)
            while (head < tail) {
                val i = q[head++]; val x = i % sw; val y = i / sw
                c.n++
                if (x < c.minX) c.minX = x
                if (x > c.maxX) c.maxX = x
                if (y < c.minY) c.minY = y
                if (y > c.maxY) c.maxY = y
                if (x > 0 && mask[i - 1] && !seen[i - 1]) { seen[i - 1] = true; q[tail++] = i - 1 }
                if (x < sw - 1 && mask[i + 1] && !seen[i + 1]) { seen[i + 1] = true; q[tail++] = i + 1 }
                if (y > 0 && mask[i - sw] && !seen[i - sw]) { seen[i - sw] = true; q[tail++] = i - sw }
                if (y < sh - 1 && mask[i + sw] && !seen[i + sw]) { seen[i + sw] = true; q[tail++] = i + sw }
            }
            out.add(c)
        }
        return out
    }

    private class Glyph(val f: FloatArray, val red: Boolean)

    /** Hai ký hiệu ở góc lá: số (trên) và chất (dưới). */
    private fun glyphs(full: Bitmap, box: IntArray): List<Glyph> {
        val (x, y, w, h) = box.toList()
        val gx0 = (x + 0.02f * w).toInt().coerceIn(0, full.width - 1)
        val gx1 = (x + 0.185f * w).toInt().coerceIn(gx0 + 1, full.width)
        val gy0 = (y + 0.01f * h).toInt().coerceIn(0, full.height - 1)
        val gy1 = (y + 0.40f * h).toInt().coerceIn(gy0 + 1, full.height)
        val cw = gx1 - gx0; val chh = gy1 - gy0
        val p = IntArray(cw * chh); full.getPixels(p, 0, cw, gx0, gy0, cw, chh)
        val ink = BooleanArray(p.size); val red = BooleanArray(p.size)
        for (i in p.indices) {
            val c = p[i]; val r = (c shr 16) and 255; val g = (c shr 8) and 255; val b = c and 255
            val isRed = r > g + 70 && r > b + 60 && g < 150
            red[i] = isRed
            ink[i] = 0.3f * r + 0.59f * g + 0.11f * b < 140f || isRed
        }
        val minRows = max(3f, 0.055f * h)
        val groups = ArrayList<IntArray>()
        var yy = 0
        while (yy < chh) {
            if (rowHasInk(ink, cw, yy)) {
                var e = yy
                while (e < chh && rowHasInk(ink, cw, e)) e++
                if (e - yy >= minRows) groups.add(intArrayOf(yy, e))
                yy = e
            } else yy++
        }
        val res = ArrayList<Glyph>()
        for (gr in groups.take(2)) {
            var cMin = cw; var cMax = -1
            for (yy2 in gr[0] until gr[1]) for (xx in 0 until cw) if (ink[yy2 * cw + xx]) { if (xx < cMin) cMin = xx; if (xx > cMax) cMax = xx }
            if (cMax < 0) continue
            val gw = cMax - cMin + 1; val gh = gr[1] - gr[0]
            val src = FloatArray(gw * gh)
            var inkN = 0; var redN = 0
            for (yy2 in 0 until gh) for (xx in 0 until gw) {
                val i = (gr[0] + yy2) * cw + cMin + xx
                if (ink[i]) { src[yy2 * gw + xx] = 1f; inkN++; if (red[i]) redN++ }
            }
            res.add(Glyph(normalize(boxResize(src, gw, gh, 8, 11)), redN > 0.4f * max(1, inkN)))
        }
        return res
    }

    private fun rowHasInk(ink: BooleanArray, w: Int, y: Int): Boolean {
        for (x in 0 until w) if (ink[y * w + x]) return true
        return false
    }

    private fun bestLabel(f: FloatArray, kind: String, red: Boolean?): Pair<String?, Float> {
        val best = HashMap<String, Float>()
        synchronized(store) {
            for (g in store.items) {
                if (g.kind != kind || g.f.size != f.size) continue
                if (red != null && g.red != red) continue
                var dot = 0f; for (i in f.indices) dot += f[i] * g.f[i]
                val c = dot / f.size
                if (c > (best[g.label] ?: -2f)) best[g.label] = c
            }
        }
        val sorted = best.entries.sortedByDescending { it.value }
        if (sorted.isEmpty()) return null to 0f
        val top = sorted[0]; val second = if (sorted.size > 1) sorted[1].value else -1f
        // chỉ tự nhận khi khớp cao VÀ vượt hẳn phương án thứ hai; còn lại hỏi người chơi
        return if (top.value >= 0.62f && top.value - second >= 0.08f) top.key to top.value else null to top.value
    }

    private fun classify(full: Bitmap, box: IntArray, visW: Int): FoundCard {
        val tid = "t${seq++}"
        val gl = glyphs(full, box)
        var rank: Int? = null; var suit: String? = null
        if (gl.size >= 2) {
            val r = bestLabel(gl[0].f, "rank", null).first
            val s = bestLabel(gl[1].f, "suit", gl[1].red).first
            if (r != null && s != null) { rank = r.toInt(); suit = s }
            else pending[tid] = Pending(gl[0].f, gl[1].f, gl[1].red)
        }
        var thumb: String? = null
        if (rank == null) {
            val cx = box[0].coerceIn(0, full.width - 1); val cy = box[1].coerceIn(0, full.height - 1)
            val tw = min(box[2], full.width - cx).coerceAtLeast(4); val th = min(box[3], full.height - cy).coerceAtLeast(4)
            val card = Bitmap.createBitmap(full, cx, cy, tw, th)
            val scaled = Bitmap.createScaledBitmap(card, max(1, tw * 160 / th), 160, true)
            val bos = ByteArrayOutputStream(); scaled.compress(Bitmap.CompressFormat.PNG, 100, bos)
            thumb = "data:image/png;base64," + Base64.encodeToString(bos.toByteArray(), Base64.NO_WRAP)
            if (scaled !== card) scaled.recycle()
            card.recycle()
        }
        return FoundCard(rank, suit, intArrayOf(box[0], box[1], visW, box[3]), tid, thumb)
    }

    /** Người chơi cho biết lá vừa hỏi là gì → lưu mẫu số và mẫu chất. */
    fun learn(tid: String, rank: Int, suit: String) {
        val p = pending.remove(tid) ?: return
        store.add(GlyphStore.G("rank", rank.toString(), p.red, p.rank))
        store.add(GlyphStore.G("suit", suit, suit == "H" || suit == "D", p.suit))
    }

    companion object {
        /** Thu nhỏ theo diện tích (giống PIL BOX): ngang trước, dọc sau. */
        fun boxResize(src: FloatArray, w: Int, h: Int, ow: Int, oh: Int): FloatArray {
            val tmp = FloatArray(h * ow)
            for (i in 0 until ow) {
                val a = i * w.toFloat() / ow; val b = (i + 1) * w.toFloat() / ow
                for (x in a.toInt() until min(w, ceil(b).toInt())) {
                    val wt = min(b, x + 1f) - max(a, x.toFloat())
                    if (wt > 0) for (y in 0 until h) tmp[y * ow + i] += src[y * w + x] * wt
                }
                for (y in 0 until h) tmp[y * ow + i] /= (b - a)
            }
            val out = FloatArray(oh * ow)
            for (j in 0 until oh) {
                val a = j * h.toFloat() / oh; val b = (j + 1) * h.toFloat() / oh
                for (y in a.toInt() until min(h, ceil(b).toInt())) {
                    val wt = min(b, y + 1f) - max(a, y.toFloat())
                    if (wt > 0) for (i in 0 until ow) out[j * ow + i] += tmp[y * ow + i] * wt
                }
                for (i in 0 until ow) out[j * ow + i] /= (b - a)
            }
            return out
        }

        fun normalize(v: FloatArray): FloatArray {
            val mean = v.average().toFloat()
            var s = 0f; for (x in v) s += (x - mean) * (x - mean)
            val sd = sqrt(s / v.size) + 1e-6f
            return FloatArray(v.size) { (v[it] - mean) / sd }
        }
    }
}
