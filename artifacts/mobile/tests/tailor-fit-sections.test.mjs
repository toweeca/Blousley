import assert from "node:assert/strict";
import test from "node:test";
import { getTailorFitSections } from "../lib/tailor-fit-sections.ts";

test("an unassigned Find My Tailor fit appears only in Design Requests", () => {
  const fit = { id: 1, findMyTailor: true, assignedTailorId: null, conversationId: null };
  const sections = getTailorFitSections([fit], "tailor-1");

  assert.deepEqual(sections.availableFitRequests, [fit]);
  assert.deepEqual(sections.customerFits, []);
});

test("only fits assigned through a conversation to this tailor appear in Customer Fits", () => {
  const ownFit = { id: 1, findMyTailor: true, assignedTailorId: "tailor-1", conversationId: 10 };
  const otherTailorFit = { id: 2, findMyTailor: true, assignedTailorId: "tailor-2", conversationId: 11 };
  const unsharedFit = { id: 3, findMyTailor: false, assignedTailorId: null, conversationId: null };
  const sections = getTailorFitSections([ownFit, otherTailorFit, unsharedFit], "tailor-1");

  assert.deepEqual(sections.availableFitRequests, []);
  assert.deepEqual(sections.customerFits, [ownFit]);
});

test("an assigned fit leaves Design Requests and enters only its assigned tailor's Customer Fits", () => {
  const assignedFit = { id: 1, findMyTailor: true, assignedTailorId: "tailor-1", conversationId: 10 };

  const assignedTailorSections = getTailorFitSections([assignedFit], "tailor-1");
  assert.deepEqual(assignedTailorSections.availableFitRequests, []);
  assert.deepEqual(assignedTailorSections.customerFits, [assignedFit]);

  const otherTailorSections = getTailorFitSections([assignedFit], "tailor-2");
  assert.deepEqual(otherTailorSections.availableFitRequests, []);
  assert.deepEqual(otherTailorSections.customerFits, []);
});
