import React, { useState } from 'react'
import { AppSidebar } from './components/AppSidebar'
import { SidebarProvider, SidebarTrigger } from './components/ui/sidebar'
import { type ChatMessageData, type ChatSessionDocument } from './types'
import axios from 'axios'
import { BACKEND_URL } from './config'
import Inputarea from './components/Inputarea'

function App() {
  const [sessions,setSessions] = useState<ChatSessionDocument[] | never[]>([])
  const [currentChat,setCurrentChat] = useState<ChatMessageData[] | null>(null);
  React.useEffect(()=>{
    async function servercall(){
      try {
        const response = await axios.get(`${BACKEND_URL}/allsessions`);
      setSessions(response.data)
      setCurrentChat(response.data[response.data.length -1].messages)
      } catch (error) {
        console.log("error while fetching sessions")
      }
    }
    servercall()
  },[])
  return (
    <>
      <SidebarProvider>
        <div className='min-h-[100vh] w-full md:pl-[14%]'>
          <AppSidebar sessionData = {sessions} setCurrentChat={setCurrentChat}/>
          <main className='w-full'>
            <SidebarTrigger />
            <Inputarea />
          </main>
        </div>
      </SidebarProvider>
    </>
  )
}

export default App
