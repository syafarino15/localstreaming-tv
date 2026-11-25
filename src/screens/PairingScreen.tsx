import React, { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { api, ApiError, setApiBaseUrl, setDeviceToken } from "../lib/api";
import { DEFAULT_API_BASE_URL } from "../lib/config";
import { secure } from "../lib/storage";
import { colors, fontSize, radius, spacing } from "../theme/tokens";

interface PairingScreenProps {
  initialBaseUrl: string;
  onPaired: () => void;
}

/**
 * First run screen.
 *
 * The crew enters the pairing code shown in the CMS. The node address is also
 * editable here so a single APK works on any ship without a rebuild.
 */
export function PairingScreen({ initialBaseUrl, onPaired }: PairingScreenProps): React.ReactElement {
  const [baseUrl, setBaseUrlValue] = useState(initialBaseUrl || DEFAULT_API_BASE_URL);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (): Promise<void> => {
    if (code.trim().length < 4) {
      setError("Masukkan kode pairing dari CMS.");
      return;
    }
    if (!/^https?:\/\/.+/.test(baseUrl.trim())) {
      setError("Alamat server harus diawali http:// atau https://");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      setApiBaseUrl(baseUrl.trim());
      await secure.setApiBaseUrl(baseUrl.trim());

      const deviceUid = (await secure.getDeviceUid()) ?? `DLU-TV-${Date.now().toString(36).toUpperCase()}`;
      const model = (await secure.getDeviceModel()) ?? "Android TV";

      const result = await api.pair({
        device_uid: deviceUid,
        pairing_code: code.trim(),
        model,
        app_version: "1.0.0",
      });

      await secure.setDeviceUid(deviceUid);
      await secure.setDeviceModel(model);
      await secure.setDeviceToken(result.device_token);
      setDeviceToken(result.device_token);

      onPaired();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.fields.length > 0 ? err.fields.map((f) => f.message).join(", ") : err.message);
      } else {
        setError("Pemasangan perangkat gagal.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.brand}>DLU X ALFATEVE</Text>
        <Text style={styles.title}>Pemasangan Perangkat</Text>
        <Text style={styles.subtitle}>
          Masukkan kode pairing yang tertera pada menu Management di CMS kapal.
        </Text>

        <Text style={styles.label}>Alamat Server Lokal</Text>
        <TextInput
          value={baseUrl}
          onChangeText={setBaseUrlValue}
          placeholder="http://192.168.1.10:8080"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />

        <Text style={styles.label}>Kode Pairing</Text>
        <TextInput
          value={code}
          onChangeText={(value) => setCode(value.replace(/[^0-9]/g, "").slice(0, 6))}
          placeholder="101001"
          placeholderTextColor={colors.textMuted}
          style={[styles.input, styles.codeInput]}
          keyboardType="number-pad"
          maxLength={6}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text
          style={[styles.submit, busy && styles.submitBusy]}
          onPress={busy ? undefined : () => void submit()}
          accessibilityRole="button"
          accessibilityLabel="Pasangkan perangkat"
        >
          {busy ? "Menghubungkan…" : "Pasangkan Perangkat"}
        </Text>

        {busy ? <ActivityIndicator color={colors.accent} style={styles.spinner} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xxl,
  },
  card: {
    width: 760,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
  },
  brand: {
    color: colors.accent,
    fontSize: fontSize.xs,
    fontWeight: "800",
    letterSpacing: 4,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: "800",
    marginTop: spacing.sm,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    lineHeight: fontSize.sm * 1.5,
    marginTop: spacing.sm,
  },
  label: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: "700",
    letterSpacing: 1,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.surfaceRaised,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.md,
    color: colors.text,
    fontSize: fontSize.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  codeInput: {
    fontSize: fontSize.xl,
    letterSpacing: 12,
    fontWeight: "800",
    textAlign: "center",
  },
  error: {
    color: colors.danger,
    fontSize: fontSize.sm,
    marginTop: spacing.md,
  },
  submit: {
    marginTop: spacing.xl,
    textAlign: "center",
    backgroundColor: colors.primary,
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: "800",
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  submitBusy: {
    opacity: 0.6,
  },
  spinner: {
    marginTop: spacing.md,
  },
});
