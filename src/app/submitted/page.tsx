import Navbar from "@/components/Navbar";
// import Header from "@/components/Userpage/Header";

const SubmittedPage = () => {
    return (
        <>
        <Navbar/>

        <div className="flex flex-column justify-center items-center">
            <h1 className="text-2xl">Submitted Successfully!</h1>
            
            <h3 className="text-lg">End of the Exam</h3>
        </div>
        
        </>
        
    )
}

export default SubmittedPage;