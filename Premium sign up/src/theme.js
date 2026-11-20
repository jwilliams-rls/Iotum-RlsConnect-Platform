import { createTheme } from "@mui/material/styles";

// Navy blue and neon orange
const navyBlue = "#000080";
const neonOrange = "#FF9F1C";

const theme = createTheme({
  palette: {
    text: { primary: navyBlue },
    primary: {
      main: navyBlue,
      contrastText: "#fff"
    },
    secondary: {
      main: neonOrange,
      contrastText: "#fff"
    }
  }
});

export default theme;


