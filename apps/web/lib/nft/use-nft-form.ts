"use client";

import { useState } from "react";
import { nftMetadataSchema, type NftMetadata } from "@repo/types";
import {
  EMPTY_NFT_DRAFT,
  type NftDraft,
  type NftDraftSection,
  type NftRootField,
} from "./draft";

type AttributeKey = "traitType" | "value";

/**
 * Owns all NFT-form state and behavior — draft values, per-field errors, the
 * generated result — and exposes simple actions to the UI. Keeping this out of
 * the components leaves them purely presentational.
 */
export function useNftForm() {
  const [draft, setDraft] = useState<NftDraft>(EMPTY_NFT_DRAFT);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generated, setGenerated] = useState<NftMetadata | null>(null);

  function clearError(path: string) {
    setErrors((prev) => {
      if (!(path in prev)) return prev;
      const next = { ...prev };
      delete next[path];
      return next;
    });
  }

  function setField(key: NftRootField, value: string) {
    setDraft((d) => ({ ...d, [key]: value }));
    clearError(key);
  }

  function setSection(section: NftDraftSection, key: string, value: string) {
    setDraft((d) => ({ ...d, [section]: { ...d[section], [key]: value } }));
    clearError(`${section}.${key}`);
  }

  function addAttribute() {
    setDraft((d) => ({
      ...d,
      attributes: [...d.attributes, { traitType: "", value: "" }],
    }));
  }

  function removeAttribute(index: number) {
    setDraft((d) => ({
      ...d,
      attributes: d.attributes.filter((_, i) => i !== index),
    }));
  }

  function updateAttribute(index: number, key: AttributeKey, value: string) {
    setDraft((d) => ({
      ...d,
      attributes: d.attributes.map((attr, i) =>
        i === index ? { ...attr, [key]: value } : attr,
      ),
    }));
  }

  function reset() {
    setDraft(EMPTY_NFT_DRAFT);
    setErrors({});
    setGenerated(null);
  }

  function submit() {
    // Drop blank attribute rows, then validate against the shared schema.
    const raw = {
      ...draft,
      attributes: draft.attributes.filter((a) => a.traitType || a.value),
    };

    const result = nftMetadataSchema.safeParse(raw);

    if (!result.success) {
      const collected: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const path = issue.path.join(".");
        if (!collected[path]) collected[path] = issue.message;
      }
      setErrors(collected);

      const firstPath = result.error.issues[0]?.path.join(".");
      if (firstPath) {
        document
          .getElementById(firstPath)
          ?.scrollIntoView({ block: "center", behavior: "smooth" });
      }
      return;
    }

    setErrors({});
    setGenerated(result.data);
    // The canonical payload the backend + on-chain program will consume.
    console.log("xNFT metadata generated:\n", JSON.stringify(result.data, null, 2));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return {
    draft,
    errors,
    generated,
    setField,
    setSection,
    addAttribute,
    removeAttribute,
    updateAttribute,
    reset,
    submit,
  };
}
