"use client"

import { useState, useEffect } from "react"
import { X, UserCog } from "lucide-react"
import { Button } from "@/components/ui/button"

import { useAuth } from "./auth-context"

import {
  verifyMember,
  updateMemberName,
  updateMemberEmail,
  updateMemberPassword,
  deleteMember,
} from "./api/memberApi"

interface Props {
  open: boolean
  onClose: () => void
}

export function MemberModal({ open, onClose }: Props) {
  const { user, logout } = useAuth()

  const [verified, setVerified] = useState(false)
  const [verifyPassword, setVerifyPassword] = useState("")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [passwordConfirm, setPasswordConfirm] = useState("")

  useEffect(() => {
    if (!user) return
    setName(user.name)
    setEmail(user.email)
  }, [user])

  if (!open || !user) return null

  const memberId = user.memberId

  async function handleVerify() {
    try {
      const result = await verifyMember(memberId, verifyPassword)
      if (!result) {
        alert("비밀번호가 일치하지 않습니다.")
        return
      }
      setVerified(true)
    } catch (err) {
      console.error(err)
      alert("인증 실패")
    }
  }

  async function handleName() {
    try {
      await updateMemberName(memberId, name)
      const stored = localStorage.getItem("volt_user")
      if (stored) {
        const parsed = JSON.parse(stored)
        parsed.name = name
        localStorage.setItem("volt_user", JSON.stringify(parsed))
      }
      alert("이름 변경 완료")
    } catch (err) {
      console.error(err)
      alert("이름 변경 실패")
    }
  }

  async function handleEmail() {
    try {
      await updateMemberEmail(memberId, email)
      const stored = localStorage.getItem("volt_user")
      if (stored) {
        const parsed = JSON.parse(stored)
        parsed.email = email
        localStorage.setItem("volt_user", JSON.stringify(parsed))
      }
      alert("아이디 변경 완료")
    } catch (err) {
      console.error(err)
      alert("아이디 변경 실패")
    }
  }

  async function handlePassword() {
    if (password !== passwordConfirm) {
      alert("비밀번호가 일치하지 않습니다.")
      return
    }
    if (password.length < 6) {
      alert("비밀번호는 6자리 이상이어야 합니다.")
      return
    }
    try {
      await updateMemberPassword(memberId, password)
      setPassword("")
      setPasswordConfirm("")
      alert("비밀번호 변경 완료")
    } catch (err) {
      console.error(err)
      alert("비밀번호 변경 실패")
    }
  }

  async function handleDelete() {
    const ok = confirm("정말 탈퇴하시겠습니까?")
    if (!ok) return
    try {
      await deleteMember(memberId)
      alert("회원탈퇴 완료")
      logout()
    } catch (err) {
      console.error(err)
      alert("회원탈퇴 실패")
    }
  }

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-background/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="cyber-glow relative w-full max-w-md rounded-xl border border-border bg-card p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-6 flex items-center gap-2">
          <UserCog className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-bold">회원정보</h2>
        </div>

        {!verified ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              회원정보 수정 전 본인 확인이 필요합니다.
            </p>
            <input
              type="password"
              value={verifyPassword}
              onChange={(e) => setVerifyPassword(e.target.value)}
              placeholder="비밀번호 입력"
              className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <Button onClick={handleVerify} className="w-full">
              본인확인
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <label className="mb-2 block text-xs font-medium text-muted-foreground">
                이름
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <Button onClick={handleName} className="mt-2 w-full">
                이름 변경
              </Button>
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium text-muted-foreground">
                아이디
              </label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <Button onClick={handleEmail} className="mt-2 w-full">
                아이디 변경
              </Button>
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium text-muted-foreground">
                새 비밀번호
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="새 비밀번호 (6자리 이상)"
                className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <input
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                placeholder="새 비밀번호 확인"
                className="mt-2 w-full rounded-md border border-border bg-input px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              {passwordConfirm && password !== passwordConfirm && (
                <p className="mt-1 text-xs text-destructive">비밀번호가 일치하지 않습니다.</p>
              )}
              <Button onClick={handlePassword} className="mt-2 w-full">
                비밀번호 변경
              </Button>
            </div>

            <Button variant="destructive" onClick={handleDelete} className="w-full">
              회원탈퇴
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}