import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import {
  Button,
  Grid,
  TextField,
  Typography,
  IconButton,
  Tooltip,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
  FormControlLabel,
  Drawer,
  List,
  ListItem,
  ListItemText,
  Paper,
  Alert,
  Snackbar,
} from "@mui/material";
import {
  Add,
  Image as ImageIcon,
  FileUpload,
  Download as DownloadIcon,
  Search as SearchIcon,
  Delete as DeleteIcon,
  Sort as SortIcon,
  ShoppingCart as ShoppingCartIcon,
} from "@mui/icons-material";
import * as XLSX from "xlsx";
import _ from "lodash";

// Constants
const STORAGE_KEYS = {
  PRODUCTS: "productData",
  SETTINGS: "settingsData",
  IMAGES: "productImages",
};

const DEFAULT_IMAGE = "https://via.placeholder.com/200";

// Helper function to compress image
const compressImage = async (base64String, maxWidth = 800) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64String;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.7));
    };
  });
};

// OrderSummary Component
const OrderSummary = React.memo(
  ({ open, onClose, orders, onExportOrder, settings }) => {
    const totalOrderValue = useMemo(() => {
      return orders.reduce((sum, order) => {
        return sum + order.customerPrice * order.orderQty;
      }, 0);
    }, [orders]);

    return (
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        PaperProps={{
          sx: { width: "400px", padding: 2 },
        }}
      >
        <Box sx={{ width: "100%" }}>
          <Typography variant="h6" gutterBottom>
            Order Summary
          </Typography>
          <List>
            {orders.map((order, index) => (
              <ListItem key={index} divider>
                <ListItemText
                  primary={`${order.brand} - ${order.itemNo}`}
                  secondary={
                    <>
                      <Typography variant="body2">
                        Quantity: {order.orderQty} units
                      </Typography>
                      <Typography variant="body2">
                        Price: €{order.customerPrice} per unit
                      </Typography>
                      <Typography variant="body2">
                        Total: €
                        {(order.customerPrice * order.orderQty).toFixed(2)}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Notes: {order.notes || "No notes"}
                      </Typography>
                    </>
                  }
                />
              </ListItem>
            ))}
          </List>
          <Box sx={{ mt: 2, p: 2, bgcolor: "background.paper" }}>
            <Typography variant="h6">
              Total Order Value: €{totalOrderValue.toFixed(2)}
            </Typography>
          </Box>
          <Button
            fullWidth
            variant="contained"
            onClick={onExportOrder}
            sx={{ mt: 2 }}
          >
            Export Order
          </Button>
        </Box>
      </Drawer>
    );
  }
);

// Settings Component
const Settings = React.memo(({ settings, onSettingsChange }) => {
  return (
    <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Global Settings
      </Typography>
      <Grid container spacing={3}>
        {Object.entries(settings).map(([key, value]) => (
          <Grid item xs={12} sm={6} md={4} key={key}>
            <TextField
              fullWidth
              label={key.replace(/([A-Z])/g, " $1").toUpperCase()}
              value={value}
              type="number"
              onChange={(e) =>
                onSettingsChange(key, parseFloat(e.target.value))
              }
              InputProps={{
                inputProps: { step: "0.01" },
              }}
            />
          </Grid>
        ))}
      </Grid>
    </Paper>
  );
});

// ProductCard Component
const ProductCard = React.memo(
  ({
    product,
    settings,
    onUpdate,
    onRemove,
    index,
    onOrderUpdate,
    onImageUpdate,
  }) => {
    const [isOrdered, setIsOrdered] = useState(false);
    const [orderQty, setOrderQty] = useState("");
    const [customerPrice, setCustomerPrice] = useState("");
    const [notes, setNotes] = useState("");

    const handleImageUpload = async (event) => {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const compressedImage = await compressImage(e.target.result);
            onImageUpdate(product.itemNo, compressedImage);
            onUpdate(index, { ...product, image: compressedImage });
          } catch (error) {
            console.error("Error processing image:", error);
          }
        };
        reader.readAsDataURL(file);
      }
    };

    const handleOrderChange = useCallback(
      (checked) => {
        setIsOrdered(checked);
        if (checked) {
          onOrderUpdate(index, {
            ...product,
            orderQty: parseInt(orderQty) || 0,
            customerPrice: parseFloat(customerPrice) || 0,
            notes,
          });
        } else {
          onOrderUpdate(index, null);
        }
      },
      [product, orderQty, customerPrice, notes, onOrderUpdate, index]
    );

    const landedPrice = useMemo(() => {
      const containerQty =
        product.containerQty40ftHQ ||
        Math.floor(67 / product.cbm) * product.casePack;
      const totalPurchaseCost = product.fobPrice * containerQty;
      const dutyCost = totalPurchaseCost * (settings.duty / 100);
      const totalCostUSD =
        totalPurchaseCost +
        dutyCost +
        settings.shippingCost +
        settings.localFreight;
      const totalCostEUR = totalCostUSD / settings.exchangeRate;
      return totalCostEUR / containerQty;
    }, [product, settings]);
    return (
      <Paper
        elevation={2}
        sx={{ p: 3, mb: 2, width: "100%", overflow: "visible" }}
      >
        <Grid container spacing={3}>
          <Grid item xs={12} sm={3}>
            <Box position="relative">
              <img
                src={product.image || DEFAULT_IMAGE}
                alt={product.description || "Product"}
                style={{
                  width: "100%",
                  height: "auto",
                  borderRadius: "8px",
                  maxHeight: "200px",
                  objectFit: "contain",
                }}
              />
              <IconButton
                sx={{ position: "absolute", bottom: 8, right: 8 }}
                onClick={() =>
                  document.getElementById(`image-upload-${index}`).click()
                }
              >
                <ImageIcon />
              </IconButton>
              <input
                type="file"
                id={`image-upload-${index}`}
                hidden
                onChange={handleImageUpload}
                accept="image/*"
              />
            </Box>
          </Grid>

          <Grid item xs={12} sm={9}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Brand"
                  value={product.brand || ""}
                  onChange={(e) =>
                    onUpdate(index, { ...product, brand: e.target.value })
                  }
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Item #"
                  value={product.itemNo || ""}
                  onChange={(e) =>
                    onUpdate(index, { ...product, itemNo: e.target.value })
                  }
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Description"
                  value={product.description || ""}
                  onChange={(e) =>
                    onUpdate(index, { ...product, description: e.target.value })
                  }
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="FOB Price ($)"
                  type="number"
                  value={product.fobPrice || ""}
                  onChange={(e) =>
                    onUpdate(index, {
                      ...product,
                      fobPrice: parseFloat(e.target.value) || 0,
                    })
                  }
                  InputProps={{
                    inputProps: { step: "0.01" },
                  }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Case Pack"
                  type="number"
                  value={product.casePack || ""}
                  onChange={(e) =>
                    onUpdate(index, {
                      ...product,
                      casePack: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="EU RRP (€)"
                  type="number"
                  value={product.euRrp || ""}
                  onChange={(e) =>
                    onUpdate(index, {
                      ...product,
                      euRrp: parseFloat(e.target.value) || 0,
                    })
                  }
                  InputProps={{
                    inputProps: { step: "0.01" },
                  }}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Container Qty (40ftHQ)"
                  type="number"
                  value={product.containerQty40ftHQ || ""}
                  onChange={(e) =>
                    onUpdate(index, {
                      ...product,
                      containerQty40ftHQ: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="CBM"
                  type="number"
                  value={product.cbm || ""}
                  onChange={(e) =>
                    onUpdate(index, {
                      ...product,
                      cbm: parseFloat(e.target.value) || 0,
                    })
                  }
                  InputProps={{
                    inputProps: { step: "0.0001" },
                  }}
                />
              </Grid>

              {/* Order Section */}
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={isOrdered}
                      onChange={(e) => handleOrderChange(e.target.checked)}
                    />
                  }
                  label="Add to Order"
                />
              </Grid>

              {isOrdered && (
                <>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Order Quantity"
                      type="number"
                      value={orderQty}
                      onChange={(e) => {
                        setOrderQty(e.target.value);
                        if (isOrdered) {
                          onOrderUpdate(index, {
                            ...product,
                            orderQty: parseInt(e.target.value) || 0,
                            customerPrice: parseFloat(customerPrice) || 0,
                            notes,
                          });
                        }
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Customer Price (€)"
                      type="number"
                      value={customerPrice}
                      onChange={(e) => {
                        setCustomerPrice(e.target.value);
                        if (isOrdered) {
                          onOrderUpdate(index, {
                            ...product,
                            orderQty: parseInt(orderQty) || 0,
                            customerPrice: parseFloat(e.target.value) || 0,
                            notes,
                          });
                        }
                      }}
                      InputProps={{
                        inputProps: { step: "0.01" },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Notes"
                      value={notes}
                      onChange={(e) => {
                        setNotes(e.target.value);
                        if (isOrdered) {
                          onOrderUpdate(index, {
                            ...product,
                            orderQty: parseInt(orderQty) || 0,
                            customerPrice: parseFloat(customerPrice) || 0,
                            notes: e.target.value,
                          });
                        }
                      }}
                    />
                  </Grid>
                </>
              )}

              <Grid item xs={12}>
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography variant="body1" color="primary">
                    Landed EU (€): €{landedPrice.toFixed(2)}
                  </Typography>
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => onRemove(index)}
                    startIcon={<DeleteIcon />}
                  >
                    Remove Product
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Paper>
    );
  }
);

// Main Component
const ProductPresentation = () => {
  const fileInputRef = useRef(null);
  const logoInputRef = useRef(null);

  const [logo, setLogo] = useState("https://via.placeholder.com/200x80");
  const [settings, setSettings] = useState({
    exchangeRate: 1.1,
    shippingCost: 5000,
    localFreight: 1000,
    duty: 4.75,
    vatRate: 21,
    percentFee: 0,
  });

  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [orderSummaryOpen, setOrderSummaryOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("itemNo");
  const [sortDirection, setSortDirection] = useState("asc");
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  // Load saved data on initial mount
  useEffect(() => {
    try {
      // Load settings
      const savedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }

      // Load products
      const savedProducts = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      if (savedProducts) {
        const parsedProducts = JSON.parse(savedProducts);

        // Load saved images
        const savedImages = localStorage.getItem(STORAGE_KEYS.IMAGES);
        const imageMap = savedImages ? JSON.parse(savedImages) : {};

        // Merge products with saved images
        const productsWithImages = parsedProducts.map((product) => ({
          ...product,
          image: imageMap[product.itemNo] || DEFAULT_IMAGE,
        }));

        setProducts(productsWithImages);
      }
    } catch (error) {
      console.error("Error loading saved data:", error);
      setSnackbar({
        open: true,
        message: "Error loading saved data",
        severity: "error",
      });
    }
  }, []);

  // Save settings when they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }, [settings]);

  // Save products when they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  }, [products]);

  // Handle image updates
  const handleImageUpdate = useCallback((itemNo, imageData) => {
    try {
      const savedImages = localStorage.getItem(STORAGE_KEYS.IMAGES) || "{}";
      const imageMap = JSON.parse(savedImages);
      imageMap[itemNo] = imageData;
      localStorage.setItem(STORAGE_KEYS.IMAGES, JSON.stringify(imageMap));
    } catch (error) {
      console.error("Error saving image:", error);
      setSnackbar({
        open: true,
        message: "Error saving image",
        severity: "error",
      });
    }
  }, []);

  // Excel Import Handler
  const handleExcelImport = useCallback((event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: "array" });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json(worksheet);

          // Load saved images
          const savedImages = localStorage.getItem(STORAGE_KEYS.IMAGES);
          const imageMap = savedImages ? JSON.parse(savedImages) : {};

          const importedProducts = json.map((row) => ({
            itemNo: row.itemNo?.toString() || "",
            brand: row.brand || "",
            description: row.description || "",
            casePack: parseInt(row.casePack) || 0,
            fobPrice: parseFloat(row.fobPrice) || 0,
            euRrp: parseFloat(row.euRrp) || 0,
            containerQty40ftHQ: parseInt(row.containerQty40ftHQ) || 0,
            customerSrp: parseFloat(row.customerSrp) || 0,
            cbm: parseFloat(row.cbm) || 0,
            image: imageMap[row.itemNo] || DEFAULT_IMAGE,
          }));

          setProducts(importedProducts);
          setSnackbar({
            open: true,
            message: "Products imported successfully",
            severity: "success",
          });
        } catch (error) {
          console.error("Error importing Excel:", error);
          setSnackbar({
            open: true,
            message: "Error importing Excel file",
            severity: "error",
          });
        }
      };
      reader.readAsArrayBuffer(file);
    }
  }, []);

  // Handle order updates
  const handleOrderUpdate = useCallback((index, orderData) => {
    setOrders((prev) => {
      const newOrders = [...prev];
      if (orderData) {
        newOrders[index] = orderData;
      } else {
        newOrders.splice(index, 1);
      }
      return newOrders.filter(Boolean);
    });
  }, []);

  // Export order
  const handleExportOrder = useCallback(() => {
    try {
      const orderWorksheet = XLSX.utils.json_to_sheet(orders);
      const orderWorkbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(orderWorkbook, orderWorksheet, "Order");
      XLSX.writeFile(
        orderWorkbook,
        `order_summary_${new Date().toISOString().split("T")[0]}.xlsx`
      );

      setSnackbar({
        open: true,
        message: "Order exported successfully",
        severity: "success",
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Error exporting order",
        severity: "error",
      });
    }
  }, [orders]);

  // Filter and Sort Products
  const filteredAndSortedProducts = useMemo(() => {
    return [...products]
      .filter(
        (product) =>
          product.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.itemNo
            ?.toString()
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          product.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => {
        const aVal = a[sortField] || "";
        const bVal = b[sortField] || "";
        return sortDirection === "asc"
          ? String(aVal).localeCompare(String(bVal))
          : String(bVal).localeCompare(String(aVal));
      });
  }, [products, searchTerm, sortField, sortDirection]);

  return (
    <Box sx={{ maxWidth: "1400px", margin: "auto", p: 3 }}>
      {/* Header */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <Box position="relative" height="80px" width="200px">
              <img
                src={logo}
                alt="Logo"
                style={{ height: "100%", objectFit: "contain" }}
              />
              <IconButton
                sx={{ position: "absolute", bottom: 0, right: 0 }}
                onClick={() => logoInputRef.current?.click()}
              >
                <ImageIcon />
              </IconButton>
              <input
                type="file"
                ref={logoInputRef}
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => setLogo(e.target.result);
                    reader.readAsDataURL(file);
                  }
                }}
                hidden
                accept="image/*"
              />
            </Box>
          </Grid>

          <Grid item xs={12} md={9}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Sort By</InputLabel>
                  <Select
                    value={sortField}
                    onChange={(e) => setSortField(e.target.value)}
                    label="Sort By"
                  >
                    <MenuItem value="itemNo">Item No</MenuItem>
                    <MenuItem value="brand">Brand</MenuItem>
                    <MenuItem value="description">Description</MenuItem>
                    <MenuItem value="fobPrice">FOB Price</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<SortIcon />}
                  onClick={() =>
                    setSortDirection((prev) =>
                      prev === "asc" ? "desc" : "asc"
                    )
                  }
                >
                  {sortDirection.toUpperCase()}
                </Button>
              </Grid>
            </Grid>
          </Grid>
        </Grid>

        <Grid container spacing={2} sx={{ mt: 2 }}>
          <Grid item>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleExcelImport}
              hidden
              accept=".xlsx, .xls"
            />
            <Button
              variant="outlined"
              onClick={() => fileInputRef.current?.click()}
              startIcon={<FileUpload />}
            >
              Import Excel
            </Button>
          </Grid>
          <Grid item>
            <Button
              variant="outlined"
              onClick={() => {
                const worksheet = XLSX.utils.json_to_sheet(products);
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, "Products");
                XLSX.writeFile(workbook, "products.xlsx");
              }}
              startIcon={<DownloadIcon />}
            >
              Export Excel
            </Button>
          </Grid>
          <Grid item>
            <Button
              variant="outlined"
              color="error"
              onClick={() => {
                if (
                  window.confirm(
                    "Are you sure you want to remove all products?"
                  )
                ) {
                  setProducts([]);
                }
              }}
              startIcon={<DeleteIcon />}
            >
              Remove All Products
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Settings */}
      <Settings
        settings={settings}
        onSettingsChange={(key, value) => {
          setSettings((prev) => ({ ...prev, [key]: value }));
        }}
      />

      {/* Products List */}
      {filteredAndSortedProducts.map((product, index) => (
        <ProductCard
          key={`${product.itemNo}-${index}`}
          product={product}
          settings={settings}
          index={index}
          onUpdate={(index, updatedProduct) => {
            setProducts((prev) => {
              const newProducts = [...prev];
              newProducts[index] = updatedProduct;
              return newProducts;
            });
          }}
          onRemove={(index) => {
            setProducts((prev) => prev.filter((_, i) => i !== index));
          }}
          onOrderUpdate={handleOrderUpdate}
          onImageUpdate={handleImageUpdate}
        />
      ))}

      {/* Add Product Button */}
      <Button
        variant="contained"
        startIcon={<Add />}
        fullWidth
        onClick={() =>
          setProducts((prev) => [
            ...prev,
            {
              brand: "",
              itemNo: "",
              description: "",
              casePack: 0,
              containerQty40ftHQ: 0,
              euRrp: 0,
              customerSrp: 0,
              fobPrice: 0,
              cbm: 0,
              image: DEFAULT_IMAGE,
            },
          ])
        }
        sx={{ mt: 2, py: 2 }}
      >
        Add Product
      </Button>

      {/* Order Summary Button */}
      <Box sx={{ position: "fixed", bottom: 20, right: 20, zIndex: 1000 }}>
        <Tooltip title={`${orders.length} items in order`}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => setOrderSummaryOpen(true)}
            startIcon={<ShoppingCartIcon />}
          >
            View Order ({orders.length})
          </Button>
        </Tooltip>
      </Box>

      {/* Order Summary Drawer */}
      <OrderSummary
        open={orderSummaryOpen}
        onClose={() => setOrderSummaryOpen(false)}
        orders={orders}
        onExportOrder={handleExportOrder}
        settings={settings}
      />

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ProductPresentation;
