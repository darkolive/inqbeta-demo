"use client";

import type { ReactNode } from "react";
import { WORKHOUSE_SEMANTIC_CLASS } from "../lib/semantic-identity";
import { GameRemainingIndicator } from "./GameRemainingIndicator";

type WorkhouseParticipantHeaderProps = {
  /** Optional welcome line; defaults to Welcome {username} when username is set. */
  welcome?: ReactNode;
  username?: string;
  className?: string;
};

export function WorkhouseParticipantHeader({
  welcome,
  username,
  className = "",
}: WorkhouseParticipantHeaderProps) {
  const left =
    welcome ??
    (username ? (
      <p className="min-w-0 text-base leading-snug">
        Welcome{" "}
        <span className={WORKHOUSE_SEMANTIC_CLASS.character}>{username}</span>
      </p>
    ) : null);

  if (!left) {
    return (
      <div className={`mt-1 flex justify-end pb-5 pl-1 ${className}`.trim()}>
        <GameRemainingIndicator compact showFederationName className="mr-0.5 shrink-0" />
      </div>
    );
  }

  return (
    <div
      className={`mt-1 flex items-start justify-between gap-4 pb-5 pl-1 ${className}`.trim()}
    >
      <div className="min-w-0 flex-1">{left}</div>
      <GameRemainingIndicator compact showFederationName className="mr-0.5 shrink-0" />
    </div>
  );
}
