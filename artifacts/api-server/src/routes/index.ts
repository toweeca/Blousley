// Copyright © 2026 Blousley. All rights reserved.
import { Router, type IRouter } from "express";
import healthRouter from "./health";
import blouseRouter from "./blouse";
import tailorRouter from "./tailor";
import preferencesRouter from "./preferences";
import ideasRouter from "./ideas";
import measurementsRouter from "./measurements";
import generateBlouseImageRouter from "./generate-blouse-image";
import chatRouter from "./chat";
import usersRouter from "./users";
import imagesRouter from "./images";
import authRouter from "./auth";
import { requireMatchingIdentity, requireSession } from "../lib/auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use(requireSession);
router.use(requireMatchingIdentity);
router.use("/blouse", blouseRouter);
router.use("/tailor", tailorRouter);
router.use("/preferences", preferencesRouter);
router.use("/ideas", ideasRouter);
router.use("/measurements", measurementsRouter);
router.use("/generate-blouse-image", generateBlouseImageRouter);
router.use("/chat", chatRouter);
router.use("/users", usersRouter);
router.use("/images", imagesRouter);

export default router;
