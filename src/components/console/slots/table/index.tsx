import { Separator } from "@/components/ui/separator";
import TableBlock from "@/components/blocks/table";
import { Table as TableSlotType } from "@/types/slots/table";
import Toolbar from "@/components/blocks/toolbar";

export default function ({ ...table }: TableSlotType) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">{table.title}</h3>
        <p className="text-sm text-muted-foreground">{table.description}</p>
      </div>
      {table.tip && (
        <div className="text-sm text-muted-foreground">
          {typeof table.tip.title === 'string' ?
            table.tip.description || table.tip.title :
            table.tip.title
          }
        </div>
      )}
      {table.toolbar && <Toolbar items={table.toolbar.items} />}
      <Separator />
      <TableBlock {...table} />
    </div>
  );
}
