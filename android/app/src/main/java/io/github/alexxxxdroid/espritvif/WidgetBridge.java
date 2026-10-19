package io.github.alexxxxdroid.espritvif;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.os.Build;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Le pont entre l'appli (JavaScript) et le widget : on lui confie la série et le test du jour. */
@CapacitorPlugin(name = "WidgetBridge")
public class WidgetBridge extends Plugin {

    @PluginMethod
    public void update(PluginCall call) {
        Context context = getContext();
        context
            .getSharedPreferences(EspritWidget.PREFS, Context.MODE_PRIVATE)
            .edit()
            .putString("name", call.getString("name", ""))
            .putInt("streak", call.getInt("streak", 0))
            .putString("streakUntil", call.getString("streakUntil", ""))
            .putString("testDay", call.getString("testDay", ""))
            .putInt("brainAge", call.getInt("brainAge", 0))
            .apply();
        EspritWidget.refreshAll(context);
        call.resolve();
    }

    /** Demande au lanceur d'ajouter le widget (Android 8 et plus, si le lanceur le permet). */
    @PluginMethod
    public void pin(PluginCall call) {
        boolean requested = false;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            AppWidgetManager manager = AppWidgetManager.getInstance(getContext());
            if (manager.isRequestPinAppWidgetSupported()) {
                requested = manager.requestPinAppWidget(new ComponentName(getContext(), EspritWidget.class), null, null);
            }
        }
        JSObject result = new JSObject();
        result.put("requested", requested);
        call.resolve(result);
    }
}
