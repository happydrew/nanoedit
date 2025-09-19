"use client";

import Empty from "@/components/blocks/empty";
import TableSlot from "@/components/console/slots/table";
import CreditsDisplay from "@/components/ui/credits-display";
import { Table as TableSlotType } from "@/types/slots/table";
import moment from "moment";
import { useTranslations } from "next-intl";

interface CreditsPageClientProps {
  data: any[];
  userCredits: any;
  user_uuid: string | null;
}

export default function CreditsPageClient({ data, userCredits, user_uuid }: CreditsPageClientProps) {
  const t = useTranslations();

  if (!user_uuid) {
    return <Empty message="no auth" />;
  }

  const table: TableSlotType = {
    title: t("my_credits.title"),
    tip: {
      title: (
        <span className="flex items-center gap-1">
          {t("my_credits.left_tip_prefix")} <CreditsDisplay credits={userCredits?.left_credits || 0} />
        </span>
      ) as any,
    },
    toolbar: {
      items: [
        {
          title: t("my_credits.recharge"),
          url: "/pricing",
          target: "_blank",
          icon: "RiBankCardLine",
        },
      ],
    },
    columns: [
      {
        title: t("my_credits.table.trans_no"),
        name: "trans_no",
      },
      {
        title: t("my_credits.table.trans_type"),
        name: "trans_type",
      },
      {
        title: t("my_credits.table.credits"),
        name: "credits",
      },
      {
        title: t("my_credits.table.created_at"),
        name: "created_at",
        callback: (v: any) => {
          return moment(v.created_at).format("YYYY-MM-DD HH:mm:ss");
        },
      },
      {
        title: t("my_credits.table.expired_at"),
        name: "expired_at",
        callback: (v: any) => {
          if (!v.expired_at) {
            return "-";
          }

          const t = moment(v.expired_at);

          return `${t.format("YYYY-MM-DD HH:mm:ss")} (${t.fromNow()})`;
        },
      },
    ],
    data,
    empty_message: t("my_credits.no_credits"),
  };

  return <TableSlot {...table} />;
}