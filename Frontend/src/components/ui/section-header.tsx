export function SectionHeader({ eyebrow, title, description, align = "start" }: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "start" | "center";
}) {
  return (
    <header className={`section-header ${align === "center" ? "section-header--center" : ""}`}>
      {eyebrow && <p className="section-eyebrow">{eyebrow}</p>}
      <h2>{title}</h2>
      {description && <p>{description}</p>}
    </header>
  );
}
