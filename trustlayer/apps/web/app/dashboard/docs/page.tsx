import { Panel } from "../../../components/shell";

export default function DocsPage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  return (
    <Panel title="API Documentation" description="Embed Swagger UI from the Node API `/docs` endpoint.">
      <iframe
        src={`${apiUrl}/docs`}
        title="TrustLayer API Docs"
        className="h-[760px] w-full rounded-3xl border border-[var(--line)] bg-white"
      />
    </Panel>
  );
}
