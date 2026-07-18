import { z } from "zod";
import type { latest as late } from "../types/announcement";
import { latestSchema } from "../types/announcement";
import { api } from "./client";

export const latest = async (): Promise<late[]> => {
  return z.array(latestSchema).parse((await api.get('announcement/latest')).data)
}