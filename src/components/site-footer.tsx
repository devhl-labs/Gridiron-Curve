import {
  DEFAULT_MODEL_VERSION,
  type ModelVersion,
} from "@/lib/ranking";

type SiteFooterProps = {
  modelVersion?: ModelVersion;
};

export function SiteFooter({
  modelVersion = DEFAULT_MODEL_VERSION,
}: SiteFooterProps) {
  return (
    <footer>
      <div className="brand">
        <span className="brand-mark">G</span>
        <span>GRIDIRON CURVE</span>
      </div>
      <p>Every result, graded in context.</p>
      <span>MODEL {modelVersion}</span>
    </footer>
  );
}
