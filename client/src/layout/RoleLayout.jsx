import React, { useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { drawerConfig } from "../config/drawerConfig";
import { getUser, logout } from "../services/auth";
import {
  AppBar, Toolbar, Typography, Box, Drawer, List, ListItemButton, ListItemText, IconButton, Divider, Button
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";

const drawerWidth = 260;

export default function RoleLayout() {
  const user = getUser();
  const nav = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(true);

  const items = useMemo(() => drawerConfig[user?.role] || [], [user?.role]);

  const go = (path) => nav(path);

  const handleLogout = () => {
    logout();
    nav("/login");
  };

  return (
    <Box sx={{ display: "flex" }}>
      <AppBar position="fixed" sx={{ zIndex: 1201 }}>
        <Toolbar>
          <IconButton color="inherit" edge="start" onClick={() => setOpen(!open)} sx={{ mr: 2 }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Assessment Portal — {user?.role}
          </Typography>
          <Button color="inherit" onClick={handleLogout}>Logout</Button>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="persistent"
        open={open}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": { width: drawerWidth, boxSizing: "border-box", mt: "64px" }
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle1">{user?.name}</Typography>
          <Typography variant="caption">{user?.email}</Typography>
        </Box>
        <Divider />
        <List>
          {items.map((it) => (
            <ListItemButton
              key={it.path}
              selected={location.pathname === it.path}
              onClick={() => go(it.path)}
            >
              <ListItemText primary={it.label} />
            </ListItemButton>
          ))}
        </List>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3, mt: "64px" }}>
        <Outlet />
      </Box>
    </Box>
  );
}
