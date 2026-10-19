package io.github.alexxxxdroid.espritvif;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.widget.RemoteViews;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * Widget d'écran d'accueil : la série en cours, le test du jour (à faire ou fait, avec l'âge
 * cérébral), et deux boutons qui ouvrent l'appli sur le test ou la séance du jour. Les données
 * viennent de l'appli (WidgetBridge) ; le widget se contente de comparer les dates à aujourd'hui.
 */
public class EspritWidget extends AppWidgetProvider {

    static final String PREFS = "esprit_vif_widget";

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) manager.updateAppWidget(id, views(context));
    }

    static void refreshAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, EspritWidget.class));
        for (int id : ids) manager.updateAppWidget(id, views(context));
    }

    static RemoteViews views(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String today = new SimpleDateFormat("yyyy-MM-dd", Locale.ROOT).format(new Date());
        String name = prefs.getString("name", "");
        int streak = prefs.getInt("streak", 0);
        String until = prefs.getString("streakUntil", "");
        boolean testDone = today.equals(prefs.getString("testDay", ""));
        int age = prefs.getInt("brainAge", 0);

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_esprit);
        views.setTextViewText(R.id.widget_title, name.isEmpty() ? "Esprit Vif" : "Esprit Vif · " + name);
        // Les dates « AAAA-MM-JJ » se comparent comme du texte.
        boolean alive = streak > 0 && !until.isEmpty() && today.compareTo(until) <= 0;
        views.setTextViewText(
            R.id.widget_streak,
            alive ? (streak == 1 ? "Série : 1 jour" : "Série : " + streak + " jours") : context.getString(R.string.widget_no_streak)
        );
        views.setTextViewText(
            R.id.widget_status,
            testDone ? (age > 0 ? "Test du jour fait · âge cérébral " + age + " ans" : "Test du jour fait") : "Test du jour : à faire"
        );
        views.setTextViewText(R.id.widget_test, testDone ? "Entraînement" : "Test du jour");
        views.setOnClickPendingIntent(R.id.widget_root, open(context, "", 1));
        views.setOnClickPendingIntent(R.id.widget_test, open(context, testDone ? "entrainement" : "test-du-jour", 2));
        views.setOnClickPendingIntent(R.id.widget_session, open(context, "seance", 3));
        return views;
    }

    private static PendingIntent open(Context context, String path, int code) {
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse("espritvif://" + path), context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        return PendingIntent.getActivity(context, code, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
}
