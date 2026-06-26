"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Pencil, Save, ShieldCheck, ShieldX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  hasPermission,
  isSuperAdmin,
  type AdminPermission
} from "@/shared/auth/permissions";
import { DataTable } from "@/shared/components/data-table";
import { useAdminSessionStore } from "@/stores/admin-session-store";
import { useAdmins } from "../hooks/use-admins";
import {
  createAdmin,
  getAdminErrorMessage,
  replaceAdminPermissions,
  resetAdminPassword,
  setAdminEnabled,
  updateAdmin
} from "../services/admins-service";
import type { AdminAccountRole, AdminAccountStatus, ManagedAdmin } from "../types/admin";

const permissionGroups: { title: string; permissions: AdminPermission[] }[] = [
  { title: "Analytics", permissions: ["analytics.read"] },
  { title: "Users", permissions: ["users.read", "users.manage"] },
  { title: "Workers", permissions: ["workers.read", "workers.manage"] },
  { title: "Orders", permissions: ["orders.read", "orders.manage"] },
  { title: "Reviews", permissions: ["reviews.read", "reviews.manage"] },
  { title: "Reports", permissions: ["reports.read", "reports.manage"] },
  { title: "Support", permissions: ["support.read", "support.manage"] },
  { title: "Content", permissions: ["content.read", "content.manage"] },
  { title: "Notifications", permissions: ["notifications.read", "notifications.manage"] },
  { title: "Admins", permissions: ["admins.read", "admins.manage", "super_admin.manage"] }
];

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function formatRole(role: AdminAccountRole) {
  return role === "SUPER_ADMIN" ? "SUPER_ADMIN" : "ADMIN";
}

function permissionLabel(permission: AdminPermission) {
  return permission.replace(".", " ");
}

function TogglePermissionList({
  disabled,
  selected,
  onToggle,
  showSuperAdminManage
}: {
  disabled?: boolean;
  selected: AdminPermission[];
  onToggle: (permission: AdminPermission) => void;
  showSuperAdminManage: boolean;
}) {
  return (
    <div className="space-y-3">
      {permissionGroups.map((group) => {
        const permissions = group.permissions.filter(
          (permission) => permission !== "super_admin.manage" || showSuperAdminManage
        );
        if (!permissions.length) return null;

        return (
          <div className="rounded-md border p-3" key={group.title}>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {group.title}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {permissions.map((permission) => (
                <label className="flex items-center gap-2 text-sm" key={permission}>
                  <input
                    checked={selected.includes(permission)}
                    disabled={disabled}
                    onChange={() => onToggle(permission)}
                    type="checkbox"
                  />
                  {permissionLabel(permission)}
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function AdminsManager() {
  const { data = [], isLoading } = useAdmins();
  const queryClient = useQueryClient();
  const session = useAdminSessionStore((state) => state.session);
  const canManageAdmins = isSuperAdmin(session) || hasPermission(session, "admins.manage");
  const canManageSuperAdmins = isSuperAdmin(session);

  const [createUsername, setCreateUsername] = useState("");
  const [createName, setCreateName] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createRole, setCreateRole] = useState<AdminAccountRole>("ADMIN");
  const [createMustChangePassword, setCreateMustChangePassword] = useState(true);
  const [createPermissions, setCreatePermissions] = useState<AdminPermission[]>([]);

  const [selectedAdminId, setSelectedAdminId] = useState<string | null>(null);
  const selectedAdmin = useMemo(
    () => data.find((admin) => admin.id === selectedAdminId) || data[0] || null,
    [data, selectedAdminId]
  );

  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<AdminAccountRole>("ADMIN");
  const [editStatus, setEditStatus] = useState<AdminAccountStatus>("ACTIVE");
  const [editMustChangePassword, setEditMustChangePassword] = useState(false);
  const [editPermissions, setEditPermissions] = useState<AdminPermission[]>([]);
  const [resetPasswordValue, setResetPasswordValue] = useState("");
  const [resetMustChangePassword, setResetMustChangePassword] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const syncSelectedAdmin = useCallback((admin: ManagedAdmin) => {
    setSelectedAdminId(admin.id);
    setEditName(admin.name || "");
    setEditRole(admin.role);
    setEditStatus(admin.status);
    setEditMustChangePassword(admin.mustChangePassword);
    setEditPermissions(admin.permissions);
    setResetPasswordValue("");
    setResetMustChangePassword(true);
  }, []);

  useEffect(() => {
    if (!selectedAdmin || selectedAdminId) return;
    syncSelectedAdmin(selectedAdmin);
  }, [selectedAdmin, selectedAdminId, syncSelectedAdmin]);

  async function refreshAdmins() {
    await queryClient.invalidateQueries({ queryKey: ["admins"] });
  }

  const createMutation = useMutation({
    mutationFn: createAdmin,
    onMutate: () => {
      setMessage(null);
      setErrorMessage(null);
    },
    onError: (error) => setErrorMessage(getAdminErrorMessage(error, "Admin yaratilmadi.")),
    onSuccess: async (admin) => {
      setMessage("Admin can now log in with username and password.");
      setCreateUsername("");
      setCreateName("");
      setCreatePassword("");
      setCreateRole("ADMIN");
      setCreateMustChangePassword(true);
      setCreatePermissions([]);
      syncSelectedAdmin(admin);
      await refreshAdmins();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ adminId, input }: { adminId: string; input: Parameters<typeof updateAdmin>[1] }) =>
      updateAdmin(adminId, input),
    onError: (error) => setErrorMessage(getAdminErrorMessage(error, "Admin ma'lumotlari saqlanmadi.")),
    onSuccess: async (admin) => {
      setMessage("Admin ma'lumotlari saqlandi.");
      syncSelectedAdmin(admin);
      await refreshAdmins();
    }
  });

  const statusMutation = useMutation({
    mutationFn: ({ adminId, enabled }: { adminId: string; enabled: boolean }) => setAdminEnabled(adminId, enabled),
    onError: (error) => setErrorMessage(getAdminErrorMessage(error, "Admin statusi saqlanmadi.")),
    onSuccess: async (admin) => {
      setMessage(admin.status === "ACTIVE" ? "Admin enabled." : "Admin disabled.");
      syncSelectedAdmin(admin);
      await refreshAdmins();
    }
  });

  const permissionsMutation = useMutation({
    mutationFn: ({ adminId, permissions }: { adminId: string; permissions: AdminPermission[] }) =>
      replaceAdminPermissions(adminId, { permissions }),
    onError: (error) => setErrorMessage(getAdminErrorMessage(error, "Permissionlar saqlanmadi.")),
    onSuccess: async (admin) => {
      setMessage("Permissionlar saqlandi.");
      syncSelectedAdmin(admin);
      await refreshAdmins();
    }
  });

  const passwordMutation = useMutation({
    mutationFn: ({ adminId, password }: { adminId: string; password: string }) =>
      resetAdminPassword(adminId, { password, mustChangePassword: resetMustChangePassword }),
    onError: (error) => setErrorMessage(getAdminErrorMessage(error, "Password yangilanmadi.")),
    onSuccess: async (admin) => {
      setMessage("Password reset qilindi.");
      setResetPasswordValue("");
      syncSelectedAdmin(admin);
      await refreshAdmins();
    }
  });

  function toggleCreatePermission(permission: AdminPermission) {
    setCreatePermissions((current) =>
      current.includes(permission) ? current.filter((item) => item !== permission) : [...current, permission]
    );
  }

  function toggleEditPermission(permission: AdminPermission) {
    setEditPermissions((current) =>
      current.includes(permission) ? current.filter((item) => item !== permission) : [...current, permission]
    );
  }

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createMutation.mutate({
      username: createUsername.trim(),
      password: createPassword,
      name: createName.trim() || undefined,
      role: createRole,
      permissions: createPermissions,
      mustChangePassword: createMustChangePassword
    });
  }

  function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedAdmin) return;

    updateMutation.mutate({
      adminId: selectedAdmin.id,
      input: {
        name: editName.trim() || null,
        role: editRole,
        status: editStatus,
        mustChangePassword: editMustChangePassword
      }
    });
  }

  function handlePermissionsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedAdmin) return;
    permissionsMutation.mutate({ adminId: selectedAdmin.id, permissions: editPermissions });
  }

  function handlePasswordReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedAdmin) return;
    passwordMutation.mutate({ adminId: selectedAdmin.id, password: resetPasswordValue });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
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
        {isLoading ? <div className="rounded-md border bg-card p-4 text-sm">Loading admins...</div> : null}
        <DataTable
          columns={[
            {
              accessorKey: "name",
              header: "Name",
              cell: ({ row }) => (
                <div>
                  <div className="font-medium">{row.original.name || "-"}</div>
                  <div className="text-xs text-muted-foreground">{row.original.mustChangePassword ? "Must change password" : ""}</div>
                </div>
              )
            },
            {
              accessorKey: "username",
              header: "Username",
              cell: ({ row }) => <div className="font-medium">{row.original.username}</div>
            },
            {
              accessorKey: "role",
              header: "Role",
              cell: ({ row }) => <Badge variant="secondary">{formatRole(row.original.role)}</Badge>
            },
            {
              accessorKey: "status",
              header: "Status",
              cell: ({ row }) => (
                <Badge variant={row.original.status === "ACTIVE" ? "success" : "danger"}>
                  {row.original.status === "ACTIVE" ? "Active" : "Disabled"}
                </Badge>
              )
            },
            {
              accessorKey: "permissions",
              header: "Permissions",
              cell: ({ row }) =>
                row.original.role === "SUPER_ADMIN" ? (
                  <Badge>All permissions</Badge>
                ) : (
                  <div className="max-w-56 text-sm text-muted-foreground">
                    {row.original.permissions.length ? `${row.original.permissions.length} permissions` : "No permissions"}
                  </div>
                )
            },
            {
              accessorKey: "lastLoginAt",
              header: "Last login",
              cell: ({ row }) => <span className="text-sm text-muted-foreground">{formatDate(row.original.lastLoginAt)}</span>
            },
            {
              accessorKey: "createdAt",
              header: "Created",
              cell: ({ row }) => <span className="text-sm text-muted-foreground">{formatDate(row.original.createdAt)}</span>
            },
            {
              id: "actions",
              header: "Actions",
              cell: ({ row }) => (
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => syncSelectedAdmin(row.original)} size="sm" type="button" variant="outline">
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  {canManageAdmins ? (
                    <Button
                      disabled={statusMutation.isPending}
                      onClick={() =>
                        statusMutation.mutate({
                          adminId: row.original.id,
                          enabled: row.original.status !== "ACTIVE"
                        })
                      }
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      {row.original.status === "ACTIVE" ? (
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
                  ) : null}
                </div>
              )
            }
          ]}
          data={data}
          emptyDescription="Hali admin account yo'q."
          emptyTitle="Adminlar yo'q"
        />
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Create admin</CardTitle>
          </CardHeader>
          <CardContent>
            {canManageAdmins ? (
              <form className="space-y-4" onSubmit={handleCreate}>
                <div>
                  <label className="text-sm font-medium">Username</label>
                  <Input
                    autoComplete="username"
                    onChange={(event) => setCreateUsername(event.target.value)}
                    required
                    value={createUsername}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Name</label>
                  <Input onChange={(event) => setCreateName(event.target.value)} value={createName} />
                </div>
                <div>
                  <label className="text-sm font-medium">Temporary password</label>
                  <Input
                    autoComplete="new-password"
                    onChange={(event) => setCreatePassword(event.target.value)}
                    required
                    type="password"
                    value={createPassword}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Role</label>
                  <select
                    className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
                    onChange={(event) => setCreateRole(event.target.value as AdminAccountRole)}
                    value={createRole}
                  >
                    <option value="ADMIN">ADMIN</option>
                    {canManageSuperAdmins ? <option value="SUPER_ADMIN">SUPER_ADMIN</option> : null}
                  </select>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    checked={createMustChangePassword}
                    onChange={(event) => setCreateMustChangePassword(event.target.checked)}
                    type="checkbox"
                  />
                  Must change password on next login
                </label>
                <TogglePermissionList
                  selected={createPermissions}
                  onToggle={toggleCreatePermission}
                  showSuperAdminManage={canManageSuperAdmins}
                />
                <Button disabled={createMutation.isPending || !createUsername || !createPassword} type="submit">
                  {createMutation.isPending ? "Creating..." : "Create"}
                </Button>
              </form>
            ) : (
              <p className="text-sm text-muted-foreground">You can view admins, but cannot create or manage them.</p>
            )}
          </CardContent>
        </Card>

        {selectedAdmin ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Edit admin</CardTitle>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={handleUpdate}>
                  <div>
                    <label className="text-sm font-medium">Username</label>
                    <Input disabled value={selectedAdmin.username} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Name</label>
                    <Input
                      disabled={!canManageAdmins}
                      onChange={(event) => setEditName(event.target.value)}
                      value={editName}
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium">Role</label>
                      <select
                        className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
                        disabled={!canManageAdmins || (!canManageSuperAdmins && selectedAdmin.role === "SUPER_ADMIN")}
                        onChange={(event) => setEditRole(event.target.value as AdminAccountRole)}
                        value={editRole}
                      >
                        <option value="ADMIN">ADMIN</option>
                        {canManageSuperAdmins || selectedAdmin.role === "SUPER_ADMIN" ? (
                          <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                        ) : null}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Status</label>
                      <select
                        className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
                        disabled={!canManageAdmins}
                        onChange={(event) => setEditStatus(event.target.value as AdminAccountStatus)}
                        value={editStatus}
                      >
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="DISABLED">DISABLED</option>
                      </select>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      checked={editMustChangePassword}
                      disabled={!canManageAdmins}
                      onChange={(event) => setEditMustChangePassword(event.target.checked)}
                      type="checkbox"
                    />
                    Must change password on next login
                  </label>
                  {canManageAdmins ? (
                    <Button disabled={updateMutation.isPending} type="submit">
                      <Save className="mr-2 h-4 w-4" />
                      Save
                    </Button>
                  ) : null}
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Permissions</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedAdmin.role === "SUPER_ADMIN" ? (
                  <Badge>All permissions</Badge>
                ) : (
                  <form className="space-y-4" onSubmit={handlePermissionsSubmit}>
                    <TogglePermissionList
                      disabled={!canManageAdmins}
                      selected={editPermissions}
                      onToggle={toggleEditPermission}
                      showSuperAdminManage={canManageSuperAdmins}
                    />
                    {canManageAdmins ? (
                      <Button disabled={permissionsMutation.isPending} type="submit">
                        <Save className="mr-2 h-4 w-4" />
                        Save permissions
                      </Button>
                    ) : null}
                  </form>
                )}
              </CardContent>
            </Card>

            {canManageAdmins ? (
              <Card>
                <CardHeader>
                  <CardTitle>Reset password</CardTitle>
                </CardHeader>
                <CardContent>
                  <form className="space-y-4" onSubmit={handlePasswordReset}>
                    <div>
                      <label className="text-sm font-medium">New temporary password</label>
                      <Input
                        autoComplete="new-password"
                        onChange={(event) => setResetPasswordValue(event.target.value)}
                        required
                        type="password"
                        value={resetPasswordValue}
                      />
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        checked={resetMustChangePassword}
                        onChange={(event) => setResetMustChangePassword(event.target.checked)}
                        type="checkbox"
                      />
                      Must change password on next login
                    </label>
                    <Button disabled={passwordMutation.isPending || !resetPasswordValue} type="submit" variant="outline">
                      <KeyRound className="mr-2 h-4 w-4" />
                      Reset password
                    </Button>
                  </form>
                </CardContent>
              </Card>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
