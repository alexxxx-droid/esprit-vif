package io.github.alexxxxdroid.espritvif;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Module maison : le widget d'écran d'accueil (enregistré avant super.onCreate, comme le veut Capacitor).
        registerPlugin(WidgetBridge.class);
        // Module maison : la sauvegarde Google Drive (jeton par les services Google du téléphone).
        registerPlugin(GoogleDrivePlugin.class);
        // Module maison : Premium à vie par Google Play Billing (achat vérifié sur l'appareil).
        registerPlugin(PlayBillingPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
