import { Outlet } from "react-router-dom";
import { Box } from "@mui/material";

const Layout = () => {
    return (
        <Box component="main" className="App">
            <Outlet />
        </Box>
    );
}

export default Layout;