import { Router, type IRouter } from "express";
import healthRouter from "./health";
import patientsRouter from "./patients";
import statisticsRouter from "./statistics";
import imagingRouter from "./imaging";
import radiomicsRouter from "./radiomics";
import storageRouter from "./storage";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(patientsRouter);
router.use(statisticsRouter);
router.use(imagingRouter);
router.use(radiomicsRouter);
router.use(storageRouter);
router.use(adminRouter);

export default router;
