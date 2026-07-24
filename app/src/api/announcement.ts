import { z } from "zod";
import type { all, latest as late } from "../types/announcement";
import { allSchema, latestSchema } from "../types/announcement";
import { api } from "./client";

export const latest = async (): Promise<late[]> => {
  return z.array(latestSchema).parse((await api.get('announcement/latest')).data)
}

export const details = async (id: string): Promise<late> => {
  return latestSchema.parse((await api.get(`announcement/${id}`)).data)
}

export const allAnnouncements = async (page: number = 1, pageSize: number = 10): Promise<all> => {
  return allSchema.parse((await api.get('announcement/all', {
    params: {
      page,
      pageSize
    }
  })).data)
}