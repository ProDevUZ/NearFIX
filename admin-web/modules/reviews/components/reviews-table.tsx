"use client";

import { DataTable } from "@/shared/components/data-table";
import { FilterBar } from "@/shared/components/filter-bar";
import { useReviews } from "../hooks/use-reviews";
import { reviewsColumns } from "../tables/reviews-columns";

export function ReviewsTable() {
  const { data = [] } = useReviews();

  return (
    <div>
      <FilterBar filters={["Rating", "Status", "Date"]} searchPlaceholder="Worker yoki client qidirish" />
      <DataTable columns={reviewsColumns} data={data} />
    </div>
  );
}
