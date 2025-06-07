import React from 'react'; 
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Header from "../components/Header";
import VaultControls from "../components/VaultControls";

export default function Home() {
  return(
    <div>
      <VaultControls />
    </div>
  );
}