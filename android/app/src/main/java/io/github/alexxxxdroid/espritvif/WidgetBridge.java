package io.github.alexxxxdroid.espritvif;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Build;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.Iterator;

/** Le pont entre l'appli (JavaScript) et le widget : on lui confie la série, le test du jour et ses textes. */
@CapacitorPlugin(name = "WidgetBridge")
public class WidgetBridge extends Plugin {

    @PluginMethod
    public void update(PluginCall call) {
        Context context = getContext();
        SharedPreferences.Editor editor = context
            .getSharedPreferences(EspritWidget.PREFS, Context.MODE_PRIVATE)
            .edit()
            .putString("name", call.getString("name", ""))
            .putInt("streak", call.getInt("streak", 0))
            .putString("streakUntil", call.getString("streakUntil", ""))
            .putString("testDay", call.getString("testDay", ""))
            .putInt("brainAge", call.getInt("brainAge", 0));
        // Les textes dans la langue de l'appli (« streakMany », « testTodo »…), préfixés « t_ ».
        JSObject texts = call.getObject("texts");
        if (texts != null) {
            Iterator<String> keys = texts.keys();
            while (keys.hasNext()) {
                String key = keys.next();
                editor.putString("t_" + key, texts.getString(key, ""));
            }
        }
        editor.apply();
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
