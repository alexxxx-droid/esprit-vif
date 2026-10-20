package io.github.alexxxxdroid.espritvif;

import android.app.Activity;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.IntentSenderRequest;
import androidx.activity.result.contract.ActivityResultContracts;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.auth.api.identity.AuthorizationRequest;
import com.google.android.gms.auth.api.identity.AuthorizationResult;
import com.google.android.gms.auth.api.identity.Identity;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.common.api.Scope;
import java.util.Collections;

/**
 * Jeton Google pour le Drive (dossier caché de l'appli seulement), par les services Google du
 * téléphone : la page de connexion de Google ne s'ouvre pas dans une vue web. La première fois,
 * Android montre l'écran d'accord ; ensuite, le jeton vient en silence.
 */
@CapacitorPlugin(name = "GoogleDrive")
public class GoogleDrivePlugin extends Plugin {

    private static final String SCOPE = "https://www.googleapis.com/auth/drive.appdata";

    private ActivityResultLauncher<IntentSenderRequest> consent;
    private PluginCall pending;

    @Override
    public void load() {
        consent = getBridge().registerForActivityResult(new ActivityResultContracts.StartIntentSenderForResult(), (result) -> {
            PluginCall call = pending;
            pending = null;
            if (call == null) return;
            if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) {
                call.reject("Accord refusé", "NEEDS_CONSENT");
                return;
            }
            try {
                resolveToken(call, Identity.getAuthorizationClient(getActivity()).getAuthorizationResultFromIntent(result.getData()));
            } catch (ApiException e) {
                call.reject(e.getMessage(), "FAILED");
            }
        });
    }

    @PluginMethod
    public void authorize(PluginCall call) {
        boolean interactive = Boolean.TRUE.equals(call.getBoolean("interactive", true));
        AuthorizationRequest request = AuthorizationRequest.builder().setRequestedScopes(Collections.singletonList(new Scope(SCOPE))).build();
        Identity.getAuthorizationClient(getActivity())
            .authorize(request)
            .addOnSuccessListener((auth) -> {
                if (!auth.hasResolution()) {
                    resolveToken(call, auth);
                    return;
                }
                // Il faut l'accord du joueur : seulement s'il vient de toucher un bouton.
                if (!interactive || auth.getPendingIntent() == null) {
                    call.reject("Accord nécessaire", "NEEDS_CONSENT");
                    return;
                }
                pending = call;
                consent.launch(new IntentSenderRequest.Builder(auth.getPendingIntent().getIntentSender()).build());
            })
            .addOnFailureListener((e) -> call.reject(e.getMessage(), "FAILED"));
    }

    private void resolveToken(PluginCall call, AuthorizationResult auth) {
        if (auth.getAccessToken() == null) {
            call.reject("Pas de jeton", "FAILED");
            return;
        }
        JSObject result = new JSObject();
        result.put("token", auth.getAccessToken());
        result.put("expiresIn", 3000);
        call.resolve(result);
    }
}
