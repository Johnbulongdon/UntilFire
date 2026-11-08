package expo.modules.walletalerts

import android.content.Intent
import android.provider.Settings
import androidx.core.app.NotificationManagerCompat
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/** The app's side of WalletListenerService: access, the on/off flag and the waiting alerts. */
class WalletAlertsModule : Module() {
  private val context get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("WalletAlerts")

    /** True once Android's notification access is allowed for UntilFire. */
    Function("hasAccess") {
      NotificationManagerCompat.getEnabledListenerPackages(context).contains(context.packageName)
    }

    /** UntilFire's own switch; off also clears anything still waiting. */
    Function("isActive") { WalletListenerService.isActive(context) }
    Function("setActive") { on: Boolean -> WalletListenerService.setActive(context, on) }

    /** Android's notification access page, where the person allows or removes access. */
    Function("openAccessSettings") {
      val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
    }

    /** Alerts waiting since the app last looked, as a JSON array string. */
    Function("pending") { WalletListenerService.read(context).toString() }

    /** Drop alerts the app has handled. */
    Function("remove") { ids: List<String> -> WalletListenerService.remove(context, ids.toSet()) }
  }
}
