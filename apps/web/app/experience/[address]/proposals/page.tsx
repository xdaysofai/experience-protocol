"use client";

import { useEffect, useMemo, useState } from "react";
import ExperienceAbi from "@/abi/Experience.json";
import { getInjectedProvider } from "@/lib/provider";
import { publicClient } from "@/lib/viemClient";
import { resolveAddressIdentity, formatAddress, AddressIdentity } from "@/lib/identity";

const RELAYER_URL = process.env.NEXT_PUBLIC_RELAYER_URL || "http://localhost:4000";
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

type ProposalStatus = "pending" | "accepted" | "rejected";

interface Proposal {
  id: string;
  experience: string;
  proposer: string;
  title: string;
  summary: string;
  newCid: string;
  votesUp: number;
  votesDown: number;
  status: ProposalStatus;
  voters: string[];
}

export default function ProposalsPage({ params }: { params: { address: string } }) {
  const experience = params.address as `0x${string}`;
  const [account, setAccount] = useState<string>("");
  const [owner, setOwner] = useState<string>("");
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [newProposal, setNewProposal] = useState({ title: "", summary: "", newCid: "" });
  const [identityMap, setIdentityMap] = useState<Record<string, AddressIdentity>>({});

  const isOwner = Boolean(account && owner && account.toLowerCase() === owner.toLowerCase());
  const identityFor = (address?: string) => (address ? identityMap[address.toLowerCase()] : undefined);

  useEffect(() => {
    loadOwner();
    loadProposals();
    connectWallet();
  }, [experience]);

  useEffect(() => {
    const addresses = new Set<string>();
    if (owner) addresses.add(owner);
    proposals.forEach((proposal) => addresses.add(proposal.proposer));

    addresses.forEach((addr) => {
      if (!addr || addr === ZERO_ADDRESS) return;
      const key = addr.toLowerCase();
      if (identityMap[key]) return;

      resolveAddressIdentity(addr).then((identity) => {
        if (!identity) return;
        setIdentityMap((prev) => (prev[key] ? prev : { ...prev, [key]: identity }));
      });
    });
  }, [owner, proposals, identityMap]);

  const statusStyles = useMemo(
    () => ({
      pending: "border-yellow-500/30 bg-yellow-500/10 text-yellow-100",
      accepted: "border-emerald-500/30 bg-emerald-500/10 text-emerald-100",
      rejected: "border-red-500/30 bg-red-500/10 text-red-100",
    }),
    []
  );

  async function loadOwner() {
    try {
      const result = await publicClient.readContract({
        address: experience,
        abi: ExperienceAbi.abi,
        functionName: "owner",
      });
      setOwner(result as string);
    } catch (err) {
      console.error("Failed to load owner", err);
    }
  }

  async function connectWallet() {
    try {
      const provider = await getInjectedProvider();
      const [connected] = await provider.request({ method: "eth_requestAccounts" });
      setAccount(connected);
    } catch (err) {
      console.error("Failed to connect wallet", err);
    }
  }

  async function loadProposals() {
    try {
      const response = await fetch(`${RELAYER_URL}/proposals?experience=${experience}`);
      const data = await response.json();
      setProposals(data.proposals || []);
    } catch (err) {
      console.error("Failed to load proposals", err);
      setError("Failed to load proposals");
    }
  }

  async function createProposal() {
    if (!account || !newProposal.title || !newProposal.summary || !newProposal.newCid) {
      setError("Fill all fields and connect wallet");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${RELAYER_URL}/proposals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          experience,
          proposer: account,
          title: newProposal.title,
          summary: newProposal.summary,
          newCid: newProposal.newCid,
        }),
      });

      if (!response.ok) throw new Error("Failed to create proposal");

      setNewProposal({ title: "", summary: "", newCid: "" });
      setShowCreateForm(false);
      loadProposals();
    } catch (err: any) {
      setError(err.message || "Failed to create proposal");
    } finally {
      setLoading(false);
    }
  }

  async function vote(proposalId: string, up: boolean) {
    if (!account) {
      setError("Connect wallet to vote");
      return;
    }

    try {
      const response = await fetch(`${RELAYER_URL}/proposals/${proposalId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ up, voter: account }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to vote");
      }

      loadProposals();
    } catch (err: any) {
      setError(err.message || "Failed to vote");
    }
  }

  async function acceptProposal(proposalId: string) {
    if (!isOwner) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${RELAYER_URL}/proposals/${proposalId}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to accept proposal");
      }

      loadProposals();
    } catch (err: any) {
      setError(err.message || "Failed to accept proposal");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-10 text-white">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <header className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg backdrop-blur">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{experience}</p>
          <h1 className="mt-2 text-3xl font-semibold">Community proposals</h1>
          <p className="mt-2 text-sm text-slate-300">
            Contributors can propose new CIDs or content updates. Accepting a proposal updates the relayer state and rewards the proposer with a 10% share of sales.
          </p>
        </header>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg">
          <div className="grid gap-4 text-sm text-slate-200 sm:grid-cols-2">
            <div>
              <p className="text-slate-400">Owner</p>
              <p className="mt-1 font-medium" title={owner}>
                {owner ? formatAddress(owner, identityFor(owner)) : "—"}
              </p>
            </div>
            <div>
              <p className="text-slate-400">Your access</p>
              <p className="mt-1 font-medium">
                {isOwner ? "✅ Owner (can accept)" : account ? "👁️ Viewer (can vote)" : "Connect wallet"}
              </p>
            </div>
          </div>
        </section>

        <section className="flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => setShowCreateForm((prev) => !prev)}
            disabled={!account}
            className="inline-flex items-center gap-2 rounded-2xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {showCreateForm ? "Cancel" : "New proposal"}
          </button>
          {!account && (
            <p className="text-sm text-slate-400">Connect a wallet to create or vote on proposals.</p>
          )}
        </section>

        {showCreateForm && (
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg">
            <h2 className="text-lg font-semibold">Create proposal</h2>
            <div className="mt-4 grid gap-4">
              <label className="text-sm text-slate-200">
                Title
                <input
                  type="text"
                  value={newProposal.title}
                  onChange={(event) => setNewProposal({ ...newProposal, title: event.target.value })}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-base text-white outline-none ring-primary-500/20 transition focus:border-primary-500/40 focus:ring"
                  placeholder="Proposal title"
                />
              </label>
              <label className="text-sm text-slate-200">
                Summary
                <textarea
                  value={newProposal.summary}
                  onChange={(event) => setNewProposal({ ...newProposal, summary: event.target.value })}
                  rows={4}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-base text-white outline-none ring-primary-500/20 transition focus:border-primary-500/40 focus:ring"
                  placeholder="Describe the change or addition"
                />
              </label>
              <label className="text-sm text-slate-200">
                New CID
                <input
                  type="text"
                  value={newProposal.newCid}
                  onChange={(event) => setNewProposal({ ...newProposal, newCid: event.target.value })}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-base text-white outline-none ring-primary-500/20 transition focus:border-primary-500/40 focus:ring"
                  placeholder="ipfs://..."
                />
              </label>
            </div>
            <button
              onClick={createProposal}
              disabled={loading}
              className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Submitting..." : "Submit proposal"}
            </button>
          </section>
        )}

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Proposals ({proposals.length})</h2>
          </div>

          {proposals.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/15 bg-white/5 p-10 text-center text-sm text-slate-300">
              No proposals yet. Be the first to submit one.
            </div>
          ) : (
            proposals.map((proposal) => {
              const hasVoted = proposal.voters.includes(account?.toLowerCase() || "");
              return (
                <article
                  key={proposal.id}
                  className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-md transition hover:border-white/20 hover:bg-white/10"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-white">{proposal.title}</h3>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium ${statusStyles[proposal.status]}`}
                        >
                          {proposal.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-slate-300">{proposal.summary}</p>
                      <dl className="space-y-1 text-xs text-slate-400">
                        <div className="flex flex-wrap gap-2">
                          <dt className="text-slate-500">Proposer:</dt>
                          <dd title={proposal.proposer}>
                            {formatAddress(proposal.proposer, identityFor(proposal.proposer))}
                            {identityFor(proposal.proposer)?.verified && (
                              <span className="ml-2 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-200">
                                Verified
                              </span>
                            )}
                          </dd>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <dt className="text-slate-500">CID:</dt>
                          <dd className="font-mono text-[11px]" title={proposal.newCid}>
                            {proposal.newCid}
                          </dd>
                        </div>
                      </dl>
                    </div>

                    <div className="shrink-0 space-y-3 text-sm text-slate-300">
                      <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-2">
                        <div className="flex items-center justify-between gap-6">
                          <span className="inline-flex items-center gap-1">👍 {proposal.votesUp}</span>
                          <span className="inline-flex items-center gap-1">👎 {proposal.votesDown}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {!hasVoted && proposal.status === "pending" && account && (
                          <>
                            <button
                              onClick={() => vote(proposal.id, true)}
                              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-500"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => vote(proposal.id, false)}
                              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-500"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {isOwner && proposal.status === "pending" && (
                          <button
                            onClick={() => acceptProposal(proposal.id)}
                            disabled={loading}
                            className="inline-flex items-center gap-2 rounded-lg border border-primary-400/40 bg-primary-500/10 px-3 py-1.5 text-xs font-semibold text-primary-100 transition hover:bg-primary-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Accept & sync
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </section>

        {error && (
          <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
