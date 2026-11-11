import { ERROR_TRACKING_META, type ErrorTrackingConfig } from "@/lib/error-tracking";

export function ErrorTrackingMeta({ config }: { config: ErrorTrackingConfig | null }) {
  if (!config) return null;
  return (
    <>
      <meta name={ERROR_TRACKING_META.dsn} content={config.dsn} />
      {config.environment && (
        <meta name={ERROR_TRACKING_META.environment} content={config.environment} />
      )}
      {config.release && <meta name={ERROR_TRACKING_META.release} content={config.release} />}
    </>
  );
}
