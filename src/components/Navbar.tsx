import Link from "next/link";
import { Suspense } from "react";
import CreateTagForm from "./forms/CreateTagForm";
import SearchInput from "./SearchInput";
import SyncDriveButton from "./SyncDriveButton";
import TagsSection from "./TagsSection";

const Navbar = () => {
  return (
    <nav className="flex h-[70px] items-center justify-between gap-4 border-b p-4">
      <Link
        href="/"
        className="flex items-center justify-between gap-2 text-xl"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 -3 48 48"
          className="size-8"
          fill="#000000"
        >
          <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
          <g
            id="SVGRepo_tracerCarrier"
            strokeLinecap="round"
            strokeLinejoin="round"
          ></g>
          <g id="SVGRepo_iconCarrier">
            <title>drive-color</title> <desc>Created with Sketch.</desc>
            <defs> </defs>
            <g
              id="Icons"
              stroke="none"
              strokeWidth="1"
              fill="none"
              fillRule="evenodd"
            >
              <g id="Color-" transform="translate(-601.000000, -955.000000)">
                <g id="drive" transform="translate(601.000000, 955.000000)">
                  <polygon
                    id="Shape"
                    fill="#3777E3"
                    points="8.00048064 42 15.9998798 28 48 28 39.9998798 42"
                  ></polygon>
                  <polygon
                    id="Shape"
                    fill="#FFCF63"
                    points="32.0004806 28 48 28 32.0004806 0 15.9998798 0"
                  ></polygon>
                  <polygon
                    id="Shape"
                    fill="#11A861"
                    points="0 28 8.00048064 42 24 14 15.9998798 0"
                  ></polygon>
                </g>
              </g>
            </g>
          </g>
        </svg>
        <p>Sodexo</p>
      </Link>

      <div className="max-w-lg flex-1">
        <Suspense>
          <SearchInput />
        </Suspense>
      </div>

      <div className="flex items-center justify-center gap-2">
        <TagsSection />
        <CreateTagForm />
        <SyncDriveButton />
      </div>
    </nav>
  );
};

export default Navbar;
