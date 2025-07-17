"use client";
import Navbar from "@/components/Navbar";
import AlreadySubmitted from "@/components/Userpage/alreadySubmitted";
import { DisplayMessage } from "@/components/Userpage/displayMessage";
import Header from "@/components/Userpage/Header";
import LoadingScreen from "@/components/Userpage/Loadingscreen";
import { FormSubmit } from "@/components/Userpage/submitForm";
import QPViewer from "@/components/Userpage/viewQp";
import { generateToken } from "@/lib/jwttoken";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export default function Home() {
  const [message, setMessage] = useState("");
  const [submitstatus, setSubmitStatus] = useState(false);

  const { data: session, status } = useSession();

  useEffect(() => {
    if (!session) return; // Ensure session is defined before calling fetchData

    const fetchData = async () => {
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
        console.error("Error fetching data:", error);
        setSubmitStatus(false);
      }
    };

    fetchData();
  }, [session]);

  if (submitstatus) {
    return <AlreadySubmitted setMessage={setMessage} />;
  }

  if (status === "loading" || !session) {
    return <LoadingScreen />;
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
