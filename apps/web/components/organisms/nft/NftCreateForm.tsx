"use client";

import { useState, type ReactNode } from "react";
import { playerPositions } from "@repo/types";
import { TextInput } from "../../atoms/TextInput/TextInput";
import { TextArea } from "../../atoms/TextArea/TextArea";
import { Select } from "../../atoms/Select/Select";
import { useNftForm } from "../../../lib/nft/use-nft-form";

/** Admin NFT-launch form: fill the metadata, preview it live, generate it. */
export function NftCreateForm() {
  const f = useNftForm();
  const { draft, errors } = f;

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        f.submit();
      }}
      className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]"
    >
      <div className="space-y-5">
        {f.generated && <Generated json={JSON.stringify(f.generated, null, 2)} />}

        {/* NFT details */}
        <Section step={1} title="NFT details">
          <Field id="nftName" label="NFT name" required error={errors.nftName}>
            <TextInput
              id="nftName"
              placeholder="Haaland Genesis #1"
              value={draft.nftName}
              invalid={!!errors.nftName}
              onChange={(e) => f.setField("nftName", e.target.value)}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="symbol" label="Symbol" hint="optional">
              <TextInput
                id="symbol"
                placeholder="XNFT"
                value={draft.symbol}
                onChange={(e) => f.setField("symbol", e.target.value)}
              />
            </Field>
            <Field id="externalUrl" label="External URL" hint="optional" error={errors.externalUrl}>
              <TextInput
                id="externalUrl"
                placeholder="https://…"
                value={draft.externalUrl}
                invalid={!!errors.externalUrl}
                onChange={(e) => f.setField("externalUrl", e.target.value)}
              />
            </Field>
          </div>
          <Field id="image" label="Footballer image URL" required error={errors.image}>
            <TextInput
              id="image"
              placeholder="https://…/haaland.png"
              value={draft.image}
              invalid={!!errors.image}
              onChange={(e) => f.setField("image", e.target.value)}
            />
          </Field>
          <Field id="description" label="Description" required error={errors.description}>
            <TextArea
              id="description"
              rows={3}
              placeholder="What makes this xNFT special…"
              value={draft.description}
              invalid={!!errors.description}
              onChange={(e) => f.setField("description", e.target.value)}
            />
          </Field>
        </Section>

        {/* Footballer */}
        <Section step={2} title="Footballer">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="player.name" label="Player name" required error={errors["player.name"]}>
              <TextInput
                id="player.name"
                placeholder="Erling Haaland"
                value={draft.player.name}
                invalid={!!errors["player.name"]}
                onChange={(e) => f.setSection("player", "name", e.target.value)}
              />
            </Field>
            <Field id="player.club" label="Club" hint="optional">
              <TextInput
                id="player.club"
                placeholder="Manchester City"
                value={draft.player.club}
                onChange={(e) => f.setSection("player", "club", e.target.value)}
              />
            </Field>
            <Field id="player.nationality" label="Nationality" hint="optional">
              <TextInput
                id="player.nationality"
                placeholder="Norway"
                value={draft.player.nationality}
                onChange={(e) => f.setSection("player", "nationality", e.target.value)}
              />
            </Field>
            <Field id="player.position" label="Position" hint="optional">
              <Select
                id="player.position"
                value={draft.player.position}
                onChange={(e) => f.setSection("player", "position", e.target.value)}
              >
                <option value="">Select…</option>
                {playerPositions.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Select>
            </Field>
            <Field id="player.jerseyNumber" label="Jersey number" hint="optional" error={errors["player.jerseyNumber"]}>
              <TextInput
                id="player.jerseyNumber"
                type="number"
                placeholder="9"
                value={draft.player.jerseyNumber}
                invalid={!!errors["player.jerseyNumber"]}
                onChange={(e) => f.setSection("player", "jerseyNumber", e.target.value)}
              />
            </Field>
            <Field id="player.dateOfBirth" label="Date of birth" hint="optional">
              <TextInput
                id="player.dateOfBirth"
                type="date"
                value={draft.player.dateOfBirth}
                onChange={(e) => f.setSection("player", "dateOfBirth", e.target.value)}
              />
            </Field>
          </div>
        </Section>

        {/* Socials */}
        <Section step={3} title="Social accounts" hint="all optional">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field id="socials.twitter" label="Twitter / X">
              <TextInput
                id="socials.twitter"
                placeholder="@erling"
                value={draft.socials.twitter}
                onChange={(e) => f.setSection("socials", "twitter", e.target.value)}
              />
            </Field>
            <Field id="socials.instagram" label="Instagram">
              <TextInput
                id="socials.instagram"
                placeholder="@erling.haaland"
                value={draft.socials.instagram}
                onChange={(e) => f.setSection("socials", "instagram", e.target.value)}
              />
            </Field>
            <Field id="socials.website" label="Website" error={errors["socials.website"]}>
              <TextInput
                id="socials.website"
                placeholder="https://…"
                value={draft.socials.website}
                invalid={!!errors["socials.website"]}
                onChange={(e) => f.setSection("socials", "website", e.target.value)}
              />
            </Field>
          </div>
        </Section>

        {/* Economics */}
        <Section step={4} title="Initial economics" hint="snapshot at mint">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field id="economics.initialPrice" label="Initial price" hint="SOL" error={errors["economics.initialPrice"]}>
              <TextInput
                id="economics.initialPrice"
                type="number"
                step="0.01"
                placeholder="2.5"
                value={draft.economics.initialPrice}
                invalid={!!errors["economics.initialPrice"]}
                onChange={(e) => f.setSection("economics", "initialPrice", e.target.value)}
              />
            </Field>
            <Field id="economics.totalSupply" label="Total supply" error={errors["economics.totalSupply"]}>
              <TextInput
                id="economics.totalSupply"
                type="number"
                placeholder="100"
                value={draft.economics.totalSupply}
                invalid={!!errors["economics.totalSupply"]}
                onChange={(e) => f.setSection("economics", "totalSupply", e.target.value)}
              />
            </Field>
            <Field id="economics.royaltyBps" label="Royalty" hint="bps · 500 = 5%" error={errors["economics.royaltyBps"]}>
              <TextInput
                id="economics.royaltyBps"
                type="number"
                placeholder="500"
                value={draft.economics.royaltyBps}
                invalid={!!errors["economics.royaltyBps"]}
                onChange={(e) => f.setSection("economics", "royaltyBps", e.target.value)}
              />
            </Field>
          </div>
        </Section>

        {/* Attributes */}
        <Section step={5} title="Custom attributes" hint="on-chain traits">
          {draft.attributes.length === 0 ? (
            <p className="rounded-lg border border-dashed border-white/10 px-4 py-5 text-center text-sm text-muted">
              No attributes yet.
            </p>
          ) : (
            <div className="space-y-3">
              {draft.attributes.map((attr, i) => (
                <div key={i} className="flex items-center gap-2">
                  <TextInput
                    placeholder="Trait (e.g. Goals)"
                    value={attr.traitType}
                    onChange={(e) => f.updateAttribute(i, "traitType", e.target.value)}
                  />
                  <TextInput
                    placeholder="Value (e.g. 12)"
                    value={attr.value}
                    onChange={(e) => f.updateAttribute(i, "value", e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => f.removeAttribute(i)}
                    aria-label="Remove"
                    className="shrink-0 rounded-lg border border-white/10 px-3 py-2.5 text-sm text-muted transition hover:border-danger/40 hover:text-danger"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={f.addAttribute}
            className="mt-3 rounded-lg border border-white/10 px-3.5 py-2 text-sm font-medium text-text transition hover:bg-white/5"
          >
            + Add attribute
          </button>
        </Section>
      </div>

      {/* Live preview + actions */}
      <aside className="space-y-3 lg:sticky lg:top-20 lg:self-start">
        <Preview draft={draft} />
        <button
          type="submit"
          className="w-full rounded-lg bg-linear-to-br from-accent to-accent-2 px-4 py-2.5 text-sm font-semibold text-black transition hover:opacity-90 active:translate-y-px"
        >
          Generate NFT
        </button>
        <button
          type="button"
          onClick={f.reset}
          className="w-full rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-muted transition hover:bg-white/5 hover:text-text"
        >
          Reset
        </button>
      </aside>
    </form>
  );
}

/* ── small local UI helpers (kept here on purpose — they're only used here) ── */

function Section({
  step,
  title,
  hint,
  children,
}: {
  step: number;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/2 p-5 sm:p-6">
      <header className="mb-5 flex items-baseline gap-2">
        <span className="grid size-6 shrink-0 place-items-center rounded-md bg-white/5 text-xs font-semibold text-muted">
          {step}
        </span>
        <h2 className="text-base font-semibold text-text">{title}</h2>
        {hint && <span className="text-xs text-muted">· {hint}</span>}
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({
  id,
  label,
  error,
  hint,
  required,
  children,
}: {
  id?: string;
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="flex items-baseline gap-2 text-sm font-medium text-text">
        {label}
        {required && <span className="text-accent">*</span>}
        {hint && <span className="text-xs font-normal text-muted">{hint}</span>}
      </label>
      {children}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

function Preview({ draft }: { draft: ReturnType<typeof useNftForm>["draft"] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-bg-elevated">
      <div className="aspect-square w-full bg-black/40">
        {draft.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={draft.image}
            alt={draft.player.name || "preview"}
            className="size-full object-cover"
            onError={(e) => {
              e.currentTarget.style.visibility = "hidden";
            }}
          />
        ) : (
          <div className="grid size-full place-items-center text-xs text-white/25">
            Image preview
          </div>
        )}
      </div>
      <div className="space-y-2 p-4">
        <p className="truncate text-sm font-semibold text-text">
          {draft.nftName || "Unnamed NFT"}
        </p>
        <p className="truncate text-xs text-muted">
          {draft.player.name || "Footballer"}
          {draft.player.club ? ` · ${draft.player.club}` : ""}
        </p>
        {draft.economics.initialPrice && (
          <span className="inline-block rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
            {draft.economics.initialPrice} SOL
          </span>
        )}
      </div>
    </div>
  );
}

function Generated({ json }: { json: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-2xl border border-accent/30 bg-accent/10 p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-accent">✓ Metadata generated (also logged to console).</p>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(json);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="shrink-0 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-text transition hover:bg-white/5"
        >
          {copied ? "Copied" : "Copy JSON"}
        </button>
      </div>
      <pre className="mt-4 max-h-72 overflow-auto rounded-lg bg-black/40 p-4 text-xs leading-relaxed text-muted">
        {json}
      </pre>
    </div>
  );
}
