"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, X, User } from "lucide-react";
import { useAuth } from "@/hooks/auth/use-auth";
import { useMembers } from "@/hooks/members/use-members";
import type { InstructorInput } from "@/lib/api/types";

interface Props {
  value: InstructorInput[];
  onChange: (instructors: InstructorInput[]) => void;
}

export function InstructorList({ value, onChange }: Props) {
  const t = useTranslations("videos.instructorList");
  const { user } = useAuth();

  const addInstructor = () => {
    onChange([...value, { name: "", affiliation: "" }]);
  };

  const addSelf = () => {
    if (!user) return;
    const already = value.some((i) => i.userId === user.id);
    if (already) return;
    onChange([...value, { userId: user.id, name: user.name, affiliation: "" }]);
  };

  const updateInstructor = (index: number, patch: Partial<InstructorInput>) => {
    const next = value.map((item, i) => (i === index ? { ...item, ...patch } : item));
    onChange(next);
  };

  const removeInstructor = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <Label>{t("label")}</Label>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={addSelf}>
          <User className="mr-1 h-4 w-4" />
          {t("addSelfAction")}
        </Button>
      </div>
      {value.map((instructor, idx) => (
        <InstructorRow
          key={idx}
          value={instructor}
          onChange={(patch) => updateInstructor(idx, patch)}
          onRemove={() => removeInstructor(idx)}
        />
      ))}
      <Button type="button" variant="ghost" size="sm" onClick={addInstructor}>
        <Plus className="mr-1 h-4 w-4" />
        {t("addAction")}
      </Button>
    </div>
  );
}

function InstructorRow({
  value,
  onChange,
  onRemove,
}: {
  value: InstructorInput;
  onChange: (patch: Partial<InstructorInput>) => void;
  onRemove: () => void;
}) {
  const t = useTranslations("videos.instructorList");
  const [isExternal, setIsExternal] = useState(!value.userId);
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const { data: membersData } = useMembers(
    !isExternal && search.length > 0 ? { search, limit: 8 } : undefined,
  );
  const members = membersData?.data ?? [];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleExternal = (checked: boolean) => {
    setIsExternal(checked);
    if (checked) {
      onChange({ userId: undefined, name: value.name, affiliation: value.affiliation });
    } else {
      onChange({ name: "", affiliation: "", userId: undefined });
      setSearch("");
    }
  };

  const selectMember = (member: {
    id: string;
    name: string;
    affiliations?: { organizationName: string; title: string | null }[];
  }) => {
    const first = member.affiliations?.[0];
    const affiliation = first
      ? [first.organizationName, first.title].filter(Boolean).join(" / ")
      : "";
    onChange({ userId: member.id, name: member.name, affiliation });
    setSearch("");
    setIsOpen(false);
  };

  return (
    <div className="rounded-md border p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={isExternal}
            onCheckedChange={toggleExternal}
            id={`ext-${value.userId ?? "new"}`}
          />
          <Label htmlFor={`ext-${value.userId ?? "new"}`} className="text-sm font-normal">
            {t("externalLabel")}
          </Label>
        </div>
        <Button type="button" variant="ghost" size="icon-xs" onClick={onRemove}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {!isExternal && (
        <div className="relative" ref={wrapperRef}>
          <Label className="text-xs text-muted-foreground">{t("userSearchLabel")}</Label>
          <Input
            placeholder={t("userSearchPlaceholder")}
            value={value.userId ? value.name : search}
            onChange={(e) => {
              if (value.userId) {
                onChange({ userId: undefined, name: "", affiliation: "" });
              }
              setSearch(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => search.length > 0 && setIsOpen(true)}
          />
          {isOpen && members.length > 0 && (
            <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-48 overflow-y-auto">
              {members.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                  onClick={() => selectMember(m)}
                >
                  {m.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs text-muted-foreground">{t("nameLabel")}</Label>
          <Input
            value={value.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder={t("namePlaceholder")}
            required={isExternal}
            readOnly={!isExternal && !!value.userId}
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">{t("affiliationLabel")}</Label>
          <Input
            value={value.affiliation ?? ""}
            onChange={(e) => onChange({ affiliation: e.target.value })}
            placeholder={t("affiliationPlaceholder")}
          />
        </div>
      </div>
    </div>
  );
}
