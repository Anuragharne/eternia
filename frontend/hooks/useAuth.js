"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext(null);

const DEFAULT_USER = {
  id: "e0f94573-eae2-4667-897f-40ad124053f7",
  email: "programmed911@gmail.com",
  user_metadata: { full_name: "Aarya Haldavanekar" },
};

const DEFAULT_PROFILE = {
  id: "e0f94573-eae2-4667-897f-40ad124053f7",
  email: "programmed911@gmail.com",
  full_name: "Aarya Haldavanekar",
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(DEFAULT_USER);
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    // 1. Check if Supabase session exists, otherwise keep DEFAULT_USER
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setSession(session);
        setUser(session.user);
        setProfile({
          id: session.user.id,
          email: session.user.email,
          full_name: session.user.user_metadata?.full_name || "Aarya Haldavanekar",
        });
      }
    });

    // 2. Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setSession(session);
        setUser(session.user);
      } else {
        setUser(DEFAULT_USER);
        setProfile(DEFAULT_PROFILE);
      }
    });

    return () => subscription?.unsubscribe();
  }, []);

  const signInWithEmail = async (email, password) => {
    setAuthError(null);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setAuthError(error.message);
      throw error;
    }
    return data;
  };

  const signUpWithEmail = async (email, password, fullName = "") => {
    setAuthError(null);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });
    if (error) {
      setAuthError(error.message);
      throw error;
    }
    return data;
  };

  const signOut = async () => {
    setAuthError(null);
    const { error } = await supabase.auth.signOut();
    if (error) {
      setAuthError(error.message);
      throw error;
    }
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        authError,
        signInWithEmail,
        signUpWithEmail,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
