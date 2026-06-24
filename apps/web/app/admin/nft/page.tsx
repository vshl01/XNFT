import { NftCreateForm } from "../../../components/organisms/nft/NftCreateForm";

export default function AdminNftPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Launch an xNFT</h1>
        <p className="mt-1 text-sm text-muted">
          Create a dynamic football NFT. The data below is the canonical
          metadata format the backend and on-chain program will reuse.
        </p>
      </div>
      <NftCreateForm />
    </div>
  );
}
