package expo.modules.walletalerts

import android.app.Notification
import android.content.Context
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import org.json.JSONArray
import org.json.JSONObject

/**
 * Keeps Google Wallet payment alerts until the app is next opened. Every other
 * app's notifications are ignored without being read. Only the title, text and
 * time are kept; the app's JavaScript turns them into a payment (so wording
 * fixes ship as normal updates) and removes them from this queue.
 */
class WalletListenerService : NotificationListenerService() {
  override fun onNotificationPosted(sbn: StatusBarNotification?) {
    if (sbn == null || sbn.packageName !in WALLET_PACKAGES) return
    if (!isActive(this)) return
    val extras = sbn.notification?.extras ?: return
    val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString() ?: ""
    val text = (extras.getCharSequence(Notification.EXTRA_BIG_TEXT) ?: extras.getCharSequence(Notification.EXTRA_TEXT))?.toString() ?: ""
    if (title.isBlank() && text.isBlank()) return
    enqueue(this, JSONObject().apply {
      // Wallet can repost one alert (an update); the same key and text is the same payment.
      put("id", "${sbn.key}|${title}|${text}".hashCode().toString())
      put("app", sbn.packageName)
      put("title", title)
      put("text", text)
      put("postedAt", sbn.postTime)
    })
  }

  companion object {
    val WALLET_PACKAGES = setOf("com.google.android.apps.walletnfcrel")
    private const val PREFS = "untilfire_wallet_alerts"
    private const val QUEUE = "queue"
    private const val ACTIVE = "active"
    private const val MAX = 200

    private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun isActive(context: Context) = prefs(context).getBoolean(ACTIVE, false)
    fun setActive(context: Context, on: Boolean) {
      prefs(context).edit().putBoolean(ACTIVE, on).apply()
      if (!on) prefs(context).edit().remove(QUEUE).apply()
    }

    @Synchronized
    fun read(context: Context): JSONArray =
      try { JSONArray(prefs(context).getString(QUEUE, "[]")) } catch (e: Exception) { JSONArray() }

    @Synchronized
    fun enqueue(context: Context, item: JSONObject) {
      val queue = read(context)
      for (i in 0 until queue.length()) if (queue.getJSONObject(i).optString("id") == item.getString("id")) return
      queue.put(item)
      val start = maxOf(0, queue.length() - MAX)
      val kept = JSONArray()
      for (i in start until queue.length()) kept.put(queue.get(i))
      prefs(context).edit().putString(QUEUE, kept.toString()).apply()
    }

    @Synchronized
    fun remove(context: Context, ids: Set<String>) {
      val queue = read(context)
      val kept = JSONArray()
      for (i in 0 until queue.length()) if (queue.getJSONObject(i).optString("id") !in ids) kept.put(queue.get(i))
      prefs(context).edit().putString(QUEUE, kept.toString()).apply()
    }
  }
}
