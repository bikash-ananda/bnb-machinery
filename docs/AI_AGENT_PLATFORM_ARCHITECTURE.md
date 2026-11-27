# B & B Machinery AI Agent Platform

Status: approved architecture baseline. This document records the owner's selected operating decisions and the current implementation boundary. It does not enable providers, connect WhatsApp, change production data, or deploy code.

## 1. Owner-approved decisions

- Deployment: HYBRID. Public customer-facing AI uses a cloud model provider through a server-side gateway. Private business agents and private business-data access remain on the Contabo VPS application/private database boundary. A cloud model receives only the minimum context needed for a request; private records must not be sent to a model unless a separately reviewed, explicit data-minimization and authorization policy permits it.
- Action policy: STRICT HUMAN APPROVAL. Agents are read-only by default. Any consequential action (quote approval/issue, order creation/confirmation, price/stock change, purchasing, payment, accounting, refund, customer/supplier mutation, publication, or outbound message) must be represented as a pending proposal and require an authorized human approval. No agent may approve its own proposal.
- Initial channels: public website chatbot, authenticated admin/staff AI workspace, and WhatsApp Business integration-ready channel. WhatsApp remains inactive until Meta Business verification, WhatsApp Business Platform credentials, webhook verification, consent/opt-out handling, template policy, and delivery tests are complete.

## 2. Existing implementation discovered on main

- Public chatbot API: `app/api/chat/route.ts`.
- Public chat UI: `components/ai/Chatbot.tsx`.
- Public support session and conversation persistence: `lib/server/support-session.ts` and `src/modules/support/*`; customer messages are stored in the private VPS database, not Neon.
- Shared model provider adapter: `lib/server/ai-agent/providers.ts`; supports OpenAI, DeepSeek, Anthropic and OpenAI-compatible APIs with server-side keys, timeout, optional fallback and usage/cost metadata.
- Customer-facing system prompt and rate limiting: `lib/server/ai.ts`.
- Admin agent definitions and role checks: `lib/ai/agents.ts`.
- Admin read-only data tools: `lib/server/ai-agent/tools.ts`.
- Admin prompt: `lib/server/ai-agent/prompt.ts`.
- The admin agent currently exposes business, sales, inventory, purchasing and accounting agent profiles, with role-filtered server-owned read tools. The model itself does not select or execute arbitrary database tools.
- Existing public chatbot already performs catalog/knowledge retrieval, conversation persistence, human handoff and optional technical reference search.
- Existing provider configuration is environment-based (`AI_PROVIDER`, `AI_MODEL`, `AI_API_KEY`, fallback settings). No new model gateway or credentials are required to define the architecture.

These existing systems must be extended and consolidated, not replaced with a second unrelated chatbot or duplicate provider stack.

## 3. Data residency and trust boundaries

### Public catalog — Neon
Neon remains the public catalog read model only: explicitly approved/published product names, descriptions, categories, brands, model/part numbers, public specifications/applications, public price mode/value, public availability label, public media references and SEO metadata.

### Private core — Contabo VPS PostgreSQL
Keep customer identities/contact details, conversations and support transcripts, staff/admin identities and permissions, suppliers, purchasing costs, margins, exact stock and stock movements, quotations containing customer data, orders, invoices, payments, accounting, audit records, internal notes, approval queues, agent execution logs and private attachments on the VPS.

### Public/private media — Cloudflare R2
Use a public bucket only for explicitly approved and published files. Keep private/draft/customer/supplier/legal/payment/accounting documents in private storage. Do not use R2 public bucket for AI chat uploads or private agent documents.

### Model providers
All model calls are server-to-server. Never expose API keys, Neon credentials, R2 credentials, WhatsApp tokens or provider secrets in browser bundles. Do not send full database rows, customer history, supplier pricing, account balances, payment evidence, staff notes or private documents to a public model. Use minimized, purpose-specific context. Log metadata and redacted summaries rather than secrets or unnecessary raw prompts.

### Neon AI Gateway
Optional provider-routing/credential abstraction only. It is not an agent database, not the private master database, and not required to ship the first phase. Evaluate model availability, regional handling, pricing and retention before enabling. Do not create AI conversation or private agent tables in Neon.

## 4. Agent registry and responsibilities

### Public agents
1. Customer Support: company facts, service areas, contact, support triage and human handoff.
2. Product Discovery: query the approved public catalog; no invented product, stock, price or specifications.
3. Spare Parts & Technical: collect machine brand/model/part details, use approved catalog/manual evidence, flag uncertain compatibility and escalate safety-critical faults.
4. Sales & Quotation Intake: collect only necessary customer details and create a draft inquiry/quote request; never approve or issue a quote.
5. Product Content Assistant: OCR/image-assisted draft creation; all claims remain unverified until staff review; owner approval required before publishing.
6. Service Intake: capture repair/maintenance request and route to staff; no appointment confirmation unless a real scheduling service confirms it.

### Private admin/staff agents
- Business intelligence, sales intelligence, inventory intelligence, purchasing assistant and accounting assistant.
- Start read-only and use existing role-based agent/tool allowlists.
- Never expose one role's data to another role. Re-check authorization on every server request; UI hiding is not authorization.
- Never return private financial/supplier/customer details through public endpoints.

## 5. Shared platform services

- Agent registry: stable agent IDs, versioned descriptions, channel eligibility, required roles, allowed tools and data classification.
- Orchestrator: route intent to one bounded agent; enforce max steps, timeouts, token budgets and tool allowlists.
- Provider gateway: one internal interface over the existing provider adapter; optional Neon AI Gateway later, behind configuration.
- Retrieval: public RAG only from approved public catalog/content; private RAG from separately permissioned VPS documents. Never mix public and private retrieval indexes.
- Tool registry: typed, schema-validated, server-owned functions. No arbitrary SQL, shell, filesystem, unrestricted URL fetch or model-supplied function names.
- Conversation and task store: VPS PostgreSQL; tenant/session isolation, retention policy, deletion workflow and consent metadata.
- Approval queue: pending proposal, action type, target record, before/after summary, requester, approver, expiry, idempotency key and audit trail.
- Human handoff: queue owner/team, urgency, conversation context with minimization, status and response SLA.
- Observability: provider/model, agent/version, latency, token usage, estimated cost, tool IDs, success/failure and redacted safety events.
- Evaluation: golden Nepali/English questions, hallucination checks, prompt-injection tests, permission tests, privacy-leak tests and regression suite.

## 6. Safe action lifecycle

1. Agent gathers evidence and proposes a structured action.
2. Server validates the payload against a strict schema and current business state.
3. Server checks the signed-in user's role and the exact permission for this action.
4. Proposal is stored as PENDING_APPROVAL in the private VPS database.
5. An authorized human reviews the target, values and consequences.
6. The human approves or rejects through an authenticated admin UI.
7. On approval, the server revalidates current state and executes the existing business service once using an idempotency key.
8. Record approver, execution result and audit event. Failed actions remain visible and are never silently retried if the operation may have partially succeeded.

Agents cannot approve their own actions. Outbound WhatsApp/email messages also require human approval during the initial rollout.

## 7. WhatsApp Business readiness

- Use the official WhatsApp Business Platform / Cloud API, not unofficial WhatsApp Web automation.
- Verify the business and phone number in Meta Business Manager.
- Store access token and app secret only in server-side deployment secrets.
- Verify webhook signatures; reject replayed/invalid events; use idempotent message IDs.
- Track user opt-in, opt-out, message category, approved templates and the 24-hour customer-service window.
- Start inbound-only and draft replies for staff approval. Enable outbound automation only after a separate safety review.
- Do not enable until webhook, delivery, retry, duplicate-event, opt-out and data-retention tests pass.

## 8. Phased implementation

### Phase 0 — architecture baseline (this change)
Record owner decisions, existing code inventory, data boundaries and rollout gates.

### Phase 1 — unify existing AI foundation
- Review current customer chat and admin assistant end-to-end.
- Consolidate shared provider configuration, error handling, usage/cost tracking and rate limiting without breaking current APIs.
- Introduce versioned agent registry and typed channel/visibility metadata.
- Add automated tests for prompt injection, unsupported claims, private-data leakage and role isolation.
- Keep every current admin data tool read-only.

### Phase 2 — public customer agent
- Connect public chatbot exclusively to the approved Neon catalog read API plus approved public knowledge.
- Keep conversation/session data on VPS.
- Add product discovery, spare-part intake and support handoff.
- Ensure catalog outage yields a safe unavailable response, not fallback to private rows.

### Phase 3 — staff workspace
- Extend the existing admin agent workspace, not a duplicate UI.
- Add task history, evidence/source display, agent selection by role, and human escalation.
- Add proposal/approval queue but do not execute consequential actions until audit and idempotency tests pass.

### Phase 4 — product content and service agents
- Create drafts from images/documents; distinguish extracted text from verified facts.
- Staff/owner approval required for publish.
- Service requests remain pending until staff confirms.

### Phase 5 — WhatsApp integration
- Official Cloud API, verified webhook, consent, inbound triage, staff-approved draft replies.
- Outbound automation remains disabled until separate approval.

### Phase 6 — controlled automation
- Consider only low-risk actions after per-action threat model, authorization tests, idempotency, audit and explicit owner approval.
- Payments, accounting postings, refunds, price/stock adjustments and approvals remain human-controlled unless separately authorized.

## 9. Release gates

Do not enable a phase until:
- typecheck, lint, unit tests and production build pass;
- public/private data boundary tests pass;
- authorization tests cover every agent and tool;
- prompt injection and tool misuse tests pass;
- cost/rate limits and provider outage behavior are tested;
- privacy retention and support handoff are verified;
- staging acceptance is recorded.

Production deployment, database migrations, enabling new providers, WhatsApp activation, public data migration and enabling agent actions each require a separate explicit approval. No secrets belong in GitHub.

## 10. Immediate next engineering tasks

1. Inspect the existing admin AI route, support schema/service and current role checks.
2. Map existing provider calls and remove duplicate or stale paths only after test coverage.
3. Add a versioned shared agent registry that describes public/private classification and channel access without granting new permissions.
4. Add tests for the public chatbot and admin agent security boundaries.
5. Prepare a separate additive private-VPS migration proposal for approval queue metadata only after schema review; do not apply it yet.
6. Keep Neon limited to public catalog data; no private AI session, prompt, memory or audit records in Neon.
7. Investigate the existing Cloudflare preview build failure independently; do not treat a green GitHub CI run as proof of Cloudflare deployment success.
