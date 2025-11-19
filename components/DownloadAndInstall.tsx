"use client";

import { useEffect, useState } from "react";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { Browser } from "@capacitor/browser";

async function downloadAndInstall(apkUrl:string){
  const response = await fetch(apkUrl);
  const blob = await response.blob();
  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  const base64 = btoa(String.fromCharCode(...bytes));

  const fileName = "update.apk";

  const result = await Filesystem.writeFile({
    path: fileName,
    data: base64,
    directory: Directory.Cache,
  });

  await Share.share({
    title: "Update App",
    text: "Click to install new version",
    url: result.uri,
    dialogTitle: "Install update",
  });
}
