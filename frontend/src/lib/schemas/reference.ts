/**
 * Schéma Zod pour la validation du body PUT /api/reference.
 * Le backend accepte un objet JSON ; on valide au moins la forme (objet) côté front
 * pour renvoyer 400 avant d’appeler le proxy.
 */
import { z } from "zod";

export const referencePutBodySchema = z.record(z.unknown()).refine((obj) => Object.keys(obj).length > 0, {
  message: "Le body doit être un objet non vide",
});

export type ReferencePutBody = z.infer<typeof referencePutBodySchema>;
