"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, ShieldX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ADMIN_PERMISSIONS, type AdminPermission } from "@/shared/auth/permissions";
import { DataTable } from "@/shared/components/data-table";
import { useAdmins } from "../hooks/use-admins";
import {
  createAdmin,
  grantAdminPermission,
  revokeAdminPermission,
  setAdminEnabled
} from "../services/admins-service";
import type { ManagedAdmin } from "../types/admin";

const permissionGroups: { title: string; permissions: AdminPermission[] }[] = [
  { title: "Analytics", permissions: ["analytics.read"] },
  { title: "Users", permissions: ["users.read", "users.manage"] },
  { title: "Workers", permissions: ["workers.read", "workers.manage"] },
  { title: "Orders", permissions: ["orders.read", "orders.manage"] },
  { title: "Reviews", permissions: ["reviews.read", "reviews.manage"] },
  { title: "Content", permissions: ["content.read", "content.manage"] },
  { title: "Notifications", permissions: ["notifications.read", "notifications.manage"] }
];

export function AdminsManager() {
  const { data = [] } = useAdmins();
  const queryClient = useQueryClient();
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<AdminPermission[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function refreshAdmins() {
    await queryClient.invalidateQueries({ queryKey: ["admins"] });
  }

  const createMutation = useMutation({
    mutationFn: createAdmin,
    onMutate: () => {
      setMessage(null);
      setErrorMessage(null);
    },
    onError: (error) => setErrorMessage(error instanceof Error ? error.message : "Admin yaratilmadi"),
    onSuccess: async () => {
      setMessage("Admin yaratildi.");
      setPhone("");
      setName("");
      setSelectedPermissions([]);
      await refreshAdmins();
    }
  });

  const statusMutation = useMutation({
    mutationFn: ({ adminId, enabled }: { adminId: string; enabled: boolean }) => setAdminEnabled(adminId, enabled),
    onError: (error) => setErrorMessage(error instanceof Error ? error.message : "Admin statusi saqlanmadi"),
    onSuccess: refreshAdmins
  });

  const permissionMutation = useMutation({
    mutationFn: ({ admin, permission }: { admin: ManagedAdmin; permission: AdminPermission }) =>
      admin.permissions.includes(permission)
        ? revokeAdminPermission(admin.id, permission)
        : grantAdminPermission(admin.id, permission),
    onError: (error) => setErrorMessage(error instanceof Error ? error.message : "Permission saqlanmadi"),
    onSuccess: refreshAdmins
  });

  function toggleSelectedPermission(permission: AdminPermission) {
    setSelectedPermissions((current) =>
      current.includes(permission) ? current.filter((item) => item !== permission) : [...current, permission]
    );
  }

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createMutation.mutate({
      phone: phone.trim(),
      name: name.trim() || undefined,
      permissions: selectedPermissions
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-4">
        {message ? (
          <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
            {message}
          </div>
        ) : null}
        {errorMessage ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {errorMessage}
          </div>
        ) : null}
        <DataTable
          columns={[
            {
              accessorKey: "phone",
              header: "Admin",
              cell: ({ row }) => (
                <div>
                  <div className="font-medium">{row.original.phone}</div>
                  <div className="text-xs text-muted-foreground">{row.original.name || "-"}</div>
                </div>
              )
            },
            {
              accessorKey: "role",
              header: "Role",
              cell: ({ row }) => <Badge variant="secondary">{row.original.role}</Badge>
            },
            {
              accessorKey: "status",
              header: "Status",
              cell: ({ row }) => (
                <Badge variant={row.original.isActive ? "success" : "danger"}>
                  {row.original.isActive ? "Active" : "Disabled"}
                </Badge>
              )
            },
            {
              accessorKey: "permissions",
              header: "Permissions",
              cell: ({ row }) =>
                row.original.role === "super_admin" ? (
                  <Badge>All permissions</Badge>
                ) : (
                  <div className="flex max-w-xl flex-wrap gap-2">
                    {ADMIN_PERMISSIONS.filter((permission) => permission !== "super_admin.manage").map((permission) => (
                      <label
                        className="flex items-center gap-1 rounded-md border px-2 py-1 text-xs"
                        key={`${row.original.id}-${permission}`}
                      >
                        <input
                          checked={row.original.permissions.includes(permission)}
                          disabled={permissionMutation.isPending}
                          onChange={() => permissionMutation.mutate({ admin: row.original, permission })}
                          type="checkbox"
                        />
                        {permission}
                      </label>
                    ))}
                  </div>
                )
            },
            {
              id: "actions",
              header: "Actions",
              cell: ({ row }) =>
                row.original.role === "super_admin" ? (
                  <span className="text-sm text-muted-foreground">Protected</span>
                ) : (
                  <Button
                    disabled={statusMutation.isPending}
                    onClick={() => statusMutation.mutate({ adminId: row.original.id, enabled: !row.original.isActive })}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    {row.original.isActive ? (
                      <>
                        <ShieldX className="mr-2 h-4 w-4" />
                        Disable
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="mr-2 h-4 w-4" />
                        Enable
                      </>
                    )}
                  </Button>
                )
            }
          ]}
          data={data}
          emptyDescription="Hali admin foydalanuvchi yo'q."
          emptyTitle="Adminlar yo'q"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create admin</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleCreate}>
            <div>
              <label className="text-sm font-medium">Phone</label>
              <Input onChange={(event) => setPhone(event.target.value)} required value={phone} />
            </div>
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input onChange={(event) => setName(event.target.value)} value={name} />
            </div>
            <div className="space-y-3">
              <div className="text-sm font-medium">Permissions</div>
              {permissionGroups.map((group) => (
                <div className="rounded-md border p-3" key={group.title}>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {group.title}
                  </div>
                  <div className="space-y-2">
                    {group.permissions.map((permission) => (
                      <label className="flex items-center gap-2 text-sm" key={permission}>
                        <input
                          checked={selectedPermissions.includes(permission)}
                          onChange={() => toggleSelectedPermission(permission)}
                          type="checkbox"
                        />
                        {permission}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <Button disabled={createMutation.isPending} type="submit">
              {createMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
