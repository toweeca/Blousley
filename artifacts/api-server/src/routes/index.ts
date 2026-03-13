import { Router, type IRouter } from "express";
import healthRouter from "./health";
import blouseRouter from "./blouse";
import tailorRouter from "./tailor";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/blouse", blouseRouter);
router.use("/tailor", tailorRouter);

export default router;
