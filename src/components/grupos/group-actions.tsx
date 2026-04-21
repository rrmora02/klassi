"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/trpc";
import Link from "next/link";
import { DeleteDialog } from "./delete-dialog";

interface Props {
  groupId:   string;
  groupName: string;
  isActive:  boolean;
}

export function GroupActions({ groupId, groupName, isActive }: Props) {
  const router = useRouter();
  const [showMenu,   setShowMenu]   = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const setActive = api.groups.setActive.useMutation({
    onSuccess: () => { router.refresh(); setShowMenu(false); },
  });

  const deleteGroup = api.groups.delete.useMutation({
    onSuccess: () => router.push("/dashboard/grupos"),
    onError:   (e) => setDeleteError(e.message),
  });

  return (
    <>
      <div style={{ display: "flex", gap: 8, alignItems: "center", position: "relative" }}>
        <Link
          href={`/dashboard/grupos/${groupId}/editar`}
          style={{
            border: "0.5px solid var(--color-border-secondary)", borderRadius: 8,
            padding: "7px 16px", fontSize: 13, color: "var(--color-text-secondary)",
            textDecoration: "none", background: "var(--color-background-primary)",
          }}
        >
          Editar
        </Link>

        <button
          onClick={() => setShowMenu(m => !m)}
          style={{
            border: "0.5px solid var(--color-border-secondary)", borderRadius: 8,
            padding: "7px 12px", fontSize: 13, color: "var(--color-text-secondary)",
            background: "var(--color-background-primary)", cursor: "pointer",
          }}
        >
          ···
        </button>

        {showMenu && (
          <div style={{
            position: "absolute", top: "110%", right: 0,
            background: "var(--color-background-primary)",
            border: "0.5px solid var(--color-border-secondary)",
            borderRadius: 10, padding: 6, minWidth: 160, zIndex: 50,
          }}>
            <button
              onClick={() => setActive.mutate({ id: groupId, isActive: !isActive })}
              disabled={setActive.isPending}
              style={{
                display: "block", width: "100%", textAlign: "left",
                padding: "8px 12px", fontSize: 13, border: "none",
                background: "transparent", color: "var(--color-text-primary)",
                cursor: "pointer", borderRadius: 6,
              }}
            >
              {isActive ? "Desactivar" : "Activar"}
            </button>
            <div style={{ height: "0.5px", background: "var(--color-border-tertiary)", margin: "4px 0" }} />
            <button
              onClick={() => { setShowMenu(false); setShowDelete(true); }}
              style={{
                display: "block", width: "100%", textAlign: "left",
                padding: "8px 12px", fontSize: 13, border: "none",
                background: "transparent", color: "#ef4444",
                cursor: "pointer", borderRadius: 6,
              }}
            >
              Eliminar grupo
            </button>
          </div>
        )}
      </div>

      {showDelete && (
        <DeleteDialog
          groupName={groupName}
          onConfirm={() => deleteGroup.mutate({ id: groupId })}
          onCancel={() => { setShowDelete(false); setDeleteError(null); }}
          isLoading={deleteGroup.isPending}
          error={deleteError}
        />
      )}
    </>
  );
}
