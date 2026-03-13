import { Router, type IRouter } from "express";
import healthRouter from "./health";
import blouseRouter from "./blouse";
import tailorRouter from "./tailor";
import preferencesRouter from "./preferences";
import ideasRouter from "./ideas";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/blouse", blouseRouter);
router.use("/tailor", tailorRouter);
router.use("/preferences", preferencesRouter);
router.use("/ideas", ideasRouter);

export default router;
