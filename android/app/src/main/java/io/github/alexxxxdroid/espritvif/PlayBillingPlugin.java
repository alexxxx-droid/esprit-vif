package io.github.alexxxxdroid.espritvif;

import android.util.Base64;
import com.android.billingclient.api.AcknowledgePurchaseParams;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.PublicKey;
import java.security.Signature;
import java.security.spec.X509EncodedKeySpec;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Achats Google Play (Play Billing Library) : un seul produit, Premium à vie, achat unique non
 * consommable. Chaque achat est vérifié ici avec la clé publique de la Play Console (signature RSA
 * de l'achat) avant d'être signalé comme valide, puis confirmé auprès de Google (« acknowledge »)
 * sans quoi Google le rembourse au bout de trois jours. Sans clé, la boutique se dit non configurée :
 * rien ne peut alors être accordé.
 */
@CapacitorPlugin(name = "PlayBilling")
public class PlayBillingPlugin extends Plugin {

    private BillingClient client;
    /** L'achat en cours : sa réponse arrive par l'écouteur des achats, pas par l'appel lui-même. */
    private PluginCall pendingPurchase;
    /** Les appels arrivés pendant la connexion : chacun reçoit sa réponse, ou l'erreur de connexion. */
    private final List<Waiting> waitingForConnection = new ArrayList<>();
    private boolean connecting = false;

    @Override
    public void load() {
        client = BillingClient.newBuilder(getContext())
            .setListener(this::onPurchasesUpdated)
            .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
            .enableAutoServiceReconnection()
            .build();
    }

    private static boolean configured() {
        return BuildConfig.PLAY_BILLING_KEY != null && !BuildConfig.PLAY_BILLING_KEY.isEmpty();
    }

    private static final class Waiting {
        final PluginCall call;
        final Runnable then;

        Waiting(PluginCall call, Runnable then) {
            this.call = call;
            this.then = then;
        }
    }

    /** Lance la connexion au service de Google Play si besoin, puis exécute `then`. */
    private void connected(PluginCall call, Runnable then) {
        if (client.isReady()) {
            then.run();
            return;
        }
        waitingForConnection.add(new Waiting(call, then));
        if (connecting) return;
        connecting = true;
        client.startConnection(new BillingClientStateListener() {
            @Override
            public void onBillingSetupFinished(BillingResult result) {
                connecting = false;
                List<Waiting> waiting = new ArrayList<>(waitingForConnection);
                waitingForConnection.clear();
                boolean ok = result.getResponseCode() == BillingClient.BillingResponseCode.OK;
                for (Waiting w : waiting) {
                    if (ok) w.then.run();
                    else w.call.reject(result.getDebugMessage(), codeOf(result.getResponseCode()));
                }
            }

            @Override
            public void onBillingServiceDisconnected() {
                connecting = false;
            }
        });
    }

    /** La boutique est-elle utilisable ? `configured` : la clé publique est présente dans l'APK. */
    @PluginMethod
    public void status(PluginCall call) {
        if (!configured()) {
            JSObject out = new JSObject();
            out.put("configured", false);
            out.put("ready", false);
            call.resolve(out);
            return;
        }
        connected(call, () -> {
            JSObject out = new JSObject();
            out.put("configured", true);
            out.put("ready", true);
            call.resolve(out);
        });
    }

    /** Le produit tel que Google Play le décrit : titre et prix dans la monnaie du joueur. */
    @PluginMethod
    public void product(PluginCall call) {
        String id = call.getString("id", "");
        connected(call, () -> queryDetails(id, (details) -> {
            if (details == null) {
                call.reject("Produit introuvable", "not-found");
                return;
            }
            ProductDetails.OneTimePurchaseOfferDetails offer = details.getOneTimePurchaseOfferDetails();
            JSObject out = new JSObject();
            out.put("id", details.getProductId());
            out.put("title", details.getName());
            out.put("price", offer != null ? offer.getFormattedPrice() : "");
            out.put("currency", offer != null ? offer.getPriceCurrencyCode() : "");
            call.resolve(out);
        }, call));
    }

    /** Ouvre la feuille d'achat de Google Play ; la réponse arrive dans `onPurchasesUpdated`. */
    @PluginMethod
    public void purchase(PluginCall call) {
        if (!configured()) {
            call.reject("Boutique non configurée", "not-configured");
            return;
        }
        if (pendingPurchase != null) {
            call.reject("Un achat est déjà en cours", "busy");
            return;
        }
        String id = call.getString("id", "");
        connected(call, () -> queryDetails(id, (details) -> {
            if (details == null) {
                call.reject("Produit introuvable", "not-found");
                return;
            }
            BillingFlowParams.ProductDetailsParams item = BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(details).build();
            BillingFlowParams params = BillingFlowParams.newBuilder().setProductDetailsParamsList(Collections.singletonList(item)).build();
            pendingPurchase = call;
            getActivity().runOnUiThread(() -> {
                BillingResult result = client.launchBillingFlow(getActivity(), params);
                if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                    PluginCall waiting = pendingPurchase;
                    pendingPurchase = null;
                    if (waiting != null) waiting.resolve(outcome(result.getResponseCode(), result.getDebugMessage(), null));
                }
            });
        }, call));
    }

    /** Les achats que Google Play connaît pour ce compte (restauration, vérification au lancement). */
    @PluginMethod
    public void owned(PluginCall call) {
        if (!configured()) {
            call.reject("Boutique non configurée", "not-configured");
            return;
        }
        connected(call, () -> client.queryPurchasesAsync(
            QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.INAPP).build(),
            (result, purchases) -> {
                if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                    call.reject(result.getDebugMessage(), codeOf(result.getResponseCode()));
                    return;
                }
                JSArray list = new JSArray();
                for (Purchase p : purchases) list.put(describe(p));
                JSObject out = new JSObject();
                out.put("purchases", list);
                call.resolve(out);
            }
        ));
    }

    private void onPurchasesUpdated(BillingResult result, List<Purchase> purchases) {
        PluginCall call = pendingPurchase;
        pendingPurchase = null;
        Purchase first = purchases != null && !purchases.isEmpty() ? purchases.get(0) : null;
        // Les achats suivants (rares) sont vérifiés et confirmés aussi ; le premier l'est dans `outcome`.
        if (purchases != null) for (int i = 1; i < purchases.size(); i++) describe(purchases.get(i));
        if (call != null) call.resolve(outcome(result.getResponseCode(), result.getDebugMessage(), first));
    }

    /** Décrit un achat pour l'appli, après l'avoir vérifié (et confirmé auprès de Google s'il est valide). */
    private JSObject describe(Purchase p) {
        boolean verified = verify(p.getOriginalJson(), p.getSignature());
        boolean purchased = p.getPurchaseState() == Purchase.PurchaseState.PURCHASED;
        if (verified && purchased && !p.isAcknowledged()) {
            client.acknowledgePurchase(AcknowledgePurchaseParams.newBuilder().setPurchaseToken(p.getPurchaseToken()).build(), (ack) -> {});
        }
        JSObject out = new JSObject();
        out.put("productIds", new JSArray(p.getProducts()));
        out.put("state", purchased ? "purchased" : p.getPurchaseState() == Purchase.PurchaseState.PENDING ? "pending" : "unknown");
        out.put("verified", verified);
        out.put("token", p.getPurchaseToken());
        out.put("orderId", p.getOrderId() == null ? "" : p.getOrderId());
        return out;
    }

    private JSObject outcome(int code, String message, Purchase purchase) {
        JSObject out = new JSObject();
        String kind;
        if (code == BillingClient.BillingResponseCode.OK && purchase != null) {
            kind = purchase.getPurchaseState() == Purchase.PurchaseState.PURCHASED ? "purchased" : "pending";
            out.put("purchase", describe(purchase));
        } else if (code == BillingClient.BillingResponseCode.USER_CANCELED) {
            kind = "cancelled";
        } else if (code == BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED) {
            kind = "already-owned";
        } else {
            kind = "error";
        }
        out.put("kind", kind);
        out.put("code", codeOf(code));
        out.put("message", message == null ? "" : message);
        return out;
    }

    private interface DetailsCallback {
        void done(ProductDetails details);
    }

    private void queryDetails(String id, DetailsCallback callback, PluginCall call) {
        QueryProductDetailsParams.Product product = QueryProductDetailsParams.Product.newBuilder()
            .setProductId(id)
            .setProductType(BillingClient.ProductType.INAPP)
            .build();
        client.queryProductDetailsAsync(
            QueryProductDetailsParams.newBuilder().setProductList(Collections.singletonList(product)).build(),
            (result, details) -> {
                if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                    call.reject(result.getDebugMessage(), codeOf(result.getResponseCode()));
                    return;
                }
                List<ProductDetails> list = details.getProductDetailsList();
                callback.done(list.isEmpty() ? null : list.get(0));
            }
        );
    }

    /** Signature RSA (SHA1withRSA) de l'achat, avec la clé publique de licence de la Play Console. */
    private static boolean verify(String signedData, String signature) {
        if (!configured() || signedData == null || signature == null || signature.isEmpty()) return false;
        try {
            byte[] keyBytes = Base64.decode(BuildConfig.PLAY_BILLING_KEY, Base64.DEFAULT);
            PublicKey key = KeyFactory.getInstance("RSA").generatePublic(new X509EncodedKeySpec(keyBytes));
            Signature check = Signature.getInstance("SHA1withRSA");
            check.initVerify(key);
            check.update(signedData.getBytes(StandardCharsets.UTF_8));
            return check.verify(Base64.decode(signature, Base64.DEFAULT));
        } catch (Exception e) {
            return false;
        }
    }

    private static String codeOf(int code) {
        switch (code) {
            case BillingClient.BillingResponseCode.OK:
                return "ok";
            case BillingClient.BillingResponseCode.USER_CANCELED:
                return "cancelled";
            case BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED:
                return "already-owned";
            case BillingClient.BillingResponseCode.SERVICE_UNAVAILABLE:
            case BillingClient.BillingResponseCode.NETWORK_ERROR:
            case BillingClient.BillingResponseCode.SERVICE_DISCONNECTED:
                return "network";
            case BillingClient.BillingResponseCode.BILLING_UNAVAILABLE:
                return "unavailable";
            case BillingClient.BillingResponseCode.ITEM_UNAVAILABLE:
                return "not-found";
            case BillingClient.BillingResponseCode.DEVELOPER_ERROR:
                return "developer-error";
            default:
                return "error";
        }
    }
}
