"use client";
import Navbar from "@/components/Navbar";
import AlreadySubmitted from "@/components/Userpage/alreadySubmitted";
import { DisplayMessage } from "@/components/Userpage/displayMessage";
import Header from "@/components/Userpage/Header";
import LoadingScreen from "@/components/Userpage/Loadingscreen";
import { FormSubmit } from "@/components/Userpage/submitForm";
import QPViewer from "@/components/Userpage/viewQp";
import ExamInstructions from "@/components/Userpage/ExamInstructions";
import { generateToken } from "@/lib/jwttoken";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export default function Home() {
  const [message, setMessage] = useState("");
  const [submitStatus, setSubmitStatus] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);

  const { data: session, status } = useSession();

  useEffect(() => {
    const fetchData = async () => {
      if (!session) return;

      const token = generateToken(
        {
          user: session?.user,
        },
        60 * 2 // Token valid for 2 minutes
      );

      try {
        const response = await fetch("/api/submitstatus", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.status === 400) {
          setMessage("You have already submitted the files.");
          setSubmitStatus(true);
          return;
        }

        if (!response.ok) {
          const errorMessage = await response.text();
          throw new Error(`Failed to fetch submission status: ${errorMessage}`);
        }

        setSubmitStatus(false);
      } catch (error) {
        console.error("Error fetching submission status:", error);
        setMessage("An error occurred while fetching submission status.");
        setSubmitStatus(false);
      }
    };

    fetchData();
  }, [session]);

  const handleProceedToExam = () => {
    setShowInstructions(false);
  };

  if (status === "loading" || !session) {
    return <LoadingScreen />;
  }

  if (submitStatus) {
    return <AlreadySubmitted setMessage={setMessage} />;
  }

  if (showInstructions) {
    return (
      <div>
        <Navbar />
        <ExamInstructions onProceed={handleProceedToExam} />
      </div>
    );
  }

  return (
    <div>
      <Navbar />
      <Header session={session} />
      <div className="flex h-[80vh]">
        <QPViewer session={session} />
        <FormSubmit setMessage={setMessage} />
        <DisplayMessage message={{ message }} setMessage={setMessage} />
      </div>
    </div>
  );
}
