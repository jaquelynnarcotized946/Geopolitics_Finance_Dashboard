import type { GetServerSideProps } from "next";

export default function AuthRedirect() {
  return null;
}

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: "/auth/signin",
      permanent: false,
    },
  };
};
