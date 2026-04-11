"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { useCallback, useState } from "react";

type Props = {
  cash: string;
  bankCash: string;
  cashFormatted: string;
  bankCashFormatted: string;
  onTransferred: () => Promise<void>;
};

function parseBal(s: string): bigint {
  try {
    return BigInt(s);
  } catch {
    return BigInt(0);
  }
}

export function BankTransferPanel({
  cash,
  bankCash,
  cashFormatted,
  bankCashFormatted,
  onTransferred,
}: Props) {
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const walletBi = parseBal(cash);
  const bankBi = parseBal(bankCash);

  const transfer = useCallback(
    async (direction: "deposit" | "withdraw") => {
      setMsg(null);
      const raw = amount.trim();
      if (!raw) {
        setMsg("Enter an amount");
        return;
      }
      setBusy(true);
      try {
        const res = await fetch("/api/knife-cash/transfer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ direction, amount: raw }),
        });
        const data = (await res.json()) as { error?: string; ok?: boolean };
        if (!res.ok) {
          setMsg(data.error ?? "Transfer failed");
          return;
        }
        setAmount("");
        await onTransferred();
      } catch {
        setMsg("Network error");
      } finally {
        setBusy(false);
      }
    },
    [amount, onTransferred],
  );

  const setPct = (pct: number, from: "wallet" | "bank") => {
    const base = from === "wallet" ? walletBi : bankBi;
    if (base <= BigInt(0)) return;
    const v = (base * BigInt(Math.floor(pct * 100))) / BigInt(10_000);
    if (v <= BigInt(0)) return;
    setAmount(v.toString());
    setMsg(null);
  };

  return (
    <Card
      padding="lg"
      className="border border-amber-500/15 bg-gradient-to-b from-emerald-950/25 via-zinc-950/80 to-black/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
    >
      <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3">
        <Icon
          icon="mdi:bank-transfer"
          className="size-5 text-amber-200/90"
          aria-hidden
        />
        <div>
          <h2 className="text-sm font-semibold text-foreground">Bank desk</h2>
          <p className="text-xs text-muted">Move cash ↔ bank (same as Discord)</p>
        </div>
      </div>

      <dl className="mt-3 space-y-2 text-xs">
        <div className="flex justify-between gap-2">
          <dt className="text-muted">Wallet</dt>
          <dd className="font-mono text-foreground">{cashFormatted}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted">Bank</dt>
          <dd className="font-mono text-foreground">{bankCashFormatted}</dd>
        </div>
      </dl>

      <label className="mt-4 block">
        <span className="text-xs font-medium text-muted">Amount</span>
        <input
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setMsg(null);
          }}
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="0"
          disabled={busy}
          className="mt-1 w-full rounded-lg border border-white/[0.1] bg-black/50 px-3 py-2.5 font-mono text-sm text-foreground outline-none ring-edge/25 focus:ring-2 disabled:opacity-50"
        />
      </label>

      <div className="mt-2 flex flex-wrap gap-1">
        <span className="w-full text-[10px] uppercase tracking-wider text-muted/80">
          Quick (wallet)
        </span>
        <Button
          type="button"
          variant="secondary"
          disabled={busy || walletBi <= BigInt(0)}
          onClick={() => setPct(0.25, "wallet")}
          className="px-2 py-1.5 text-xs"
        >
          25%
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={busy || walletBi <= BigInt(0)}
          onClick={() => setPct(0.5, "wallet")}
          className="px-2 py-1.5 text-xs"
        >
          50%
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={busy || walletBi <= BigInt(0)}
          onClick={() => setPct(1, "wallet")}
          className="px-2 py-1.5 text-xs"
        >
          Max
        </Button>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        <span className="w-full text-[10px] uppercase tracking-wider text-muted/80">
          Quick (bank)
        </span>
        <Button
          type="button"
          variant="secondary"
          disabled={busy || bankBi <= BigInt(0)}
          onClick={() => setPct(0.25, "bank")}
          className="px-2 py-1.5 text-xs"
        >
          25%
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={busy || bankBi <= BigInt(0)}
          onClick={() => setPct(0.5, "bank")}
          className="px-2 py-1.5 text-xs"
        >
          50%
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={busy || bankBi <= BigInt(0)}
          onClick={() => setPct(1, "bank")}
          className="px-2 py-1.5 text-xs"
        >
          Max
        </Button>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <Button
          type="button"
          variant="primary"
          disabled={busy || !amount.trim()}
          onClick={() => void transfer("deposit")}
          className="w-full justify-center gap-2"
        >
          <Icon icon="mdi:bank-plus" className="size-4" aria-hidden />
          To bank
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={busy || !amount.trim()}
          onClick={() => void transfer("withdraw")}
          className="w-full justify-center gap-2"
        >
          <Icon icon="mdi:wallet-plus" className="size-4" aria-hidden />
          To wallet
        </Button>
      </div>

      {msg ? (
        <p className="mt-3 text-xs text-danger-foreground" role="status">
          {msg}
        </p>
      ) : null}
    </Card>
  );
}
