import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Clock } from "lucide-react";

interface SessionTimeoutWarningProps {
  open: boolean;
  timeRemaining: number;
  onExtend: () => void;
  onLogout: () => void;
}

export function SessionTimeoutWarning({
  open,
  timeRemaining,
  onExtend,
  onLogout,
}: SessionTimeoutWarningProps) {
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="border-orange-500 bg-slate-900">
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-500" />
            <AlertDialogTitle className="text-orange-500">
              Session Timeout Warning
            </AlertDialogTitle>
          </div>
        </AlertDialogHeader>
        <AlertDialogDescription className="text-slate-300">
          Your session will expire in{" "}
          <span className="font-bold text-orange-400">
            {minutes}:{seconds.toString().padStart(2, "0")}
          </span>{" "}
          due to inactivity. Click "Continue Session" to stay logged in or "Logout" to exit.
        </AlertDialogDescription>
        <div className="flex gap-3 justify-end mt-4">
          <AlertDialogCancel
            onClick={onLogout}
            className="bg-red-600 hover:bg-red-700 text-white border-0"
          >
            Logout
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onExtend}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            Continue Session
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
