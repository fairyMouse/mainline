import { connection } from "next/server";
import { getDecision, listItems } from "@/lib/db";
import { Board } from "./board";

export default async function Page() {
  await connection();
  return <Board items={listItems()} decision={getDecision()} />;
}
