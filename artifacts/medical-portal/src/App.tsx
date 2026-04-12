import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Patients from "@/pages/patients";
import PatientDetail from "@/pages/patient-detail";
import Statistics from "@/pages/statistics";
import Imaging from "@/pages/imaging";
import Radiomics from "@/pages/radiomics";
import Survival from "@/pages/survival";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/patients/:id" component={PatientDetail} />
      <Route path="/patients" component={Patients} />
      <Route path="/statistics" component={Statistics} />
      <Route path="/survival" component={Survival} />
      <Route path="/imaging" component={Imaging} />
      <Route path="/radiomics" component={Radiomics} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
